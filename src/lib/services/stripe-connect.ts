import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  return new Stripe(key);
}

export async function createConnectedAccount(params: {
  userId: string;
  email: string;
  name?: string;
  country?: string;
  tosAcceptanceIp?: string;
}): Promise<{ stripeAccountId: string }> {
  const stripe = getStripe();

  const account = await stripe.accounts.create({
    type: "custom",
    country: params.country || "FR",
    email: params.email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    individual: {
      email: params.email,
      first_name: params.name?.split(" ")[0] || undefined,
      last_name: params.name?.split(" ").slice(1).join(" ") || undefined,
    },
    business_profile: {
      mcc: "7299",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz",
    },
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: params.tosAcceptanceIp || "0.0.0.0",
    },
    metadata: { userId: params.userId },
  });

  return { stripeAccountId: account.id };
}

export async function addExternalBankAccount(params: {
  stripeAccountId: string;
  iban: string;
  holderName: string;
  country: string;
  currency: string;
}): Promise<{ externalAccountId: string; bankName?: string; last4?: string }> {
  const stripe = getStripe();

  const bankAccount = await stripe.accounts.createExternalAccount(
    params.stripeAccountId,
    {
      external_account: {
        object: "bank_account",
        country: params.country,
        currency: params.currency.toLowerCase(),
        account_holder_name: params.holderName,
        account_holder_type: "individual",
        account_number: params.iban,
      } as any,
    }
  );

  const ba = bankAccount as Stripe.BankAccount;

  return {
    externalAccountId: ba.id,
    bankName: ba.bank_name || undefined,
    last4: ba.last4 || undefined,
  };
}

export async function deleteExternalBankAccount(params: {
  stripeAccountId: string;
  externalAccountId: string;
}): Promise<void> {
  const stripe = getStripe();
  await stripe.accounts.deleteExternalAccount(
    params.stripeAccountId,
    params.externalAccountId
  );
}

/**
 * Solde du compte CONNECTÉ du vendeur, pour une devise donnée (défaut EUR pour
 * compat). Toujours scopé via { stripeAccount } → jamais le solde plateforme.
 * `byCurrency` expose le détail multi-devises sans casser les appelants.
 */
export async function getConnectedBalance(
  stripeAccountId: string,
  currency = "eur"
): Promise<{
  available: number;
  pending: number;
  currency: string;
  byCurrency: Record<string, { available: number; pending: number }>;
}> {
  const stripe = getStripe();
  const cur = currency.toLowerCase();

  const balance = await stripe.balance.retrieve(
    {},
    { stripeAccount: stripeAccountId }
  );

  const byCurrency: Record<string, { available: number; pending: number }> = {};
  for (const b of balance.available) {
    byCurrency[b.currency] = { available: b.amount, pending: byCurrency[b.currency]?.pending ?? 0 };
  }
  for (const b of balance.pending) {
    byCurrency[b.currency] = { available: byCurrency[b.currency]?.available ?? 0, pending: b.amount };
  }

  const available = balance.available
    .filter((b) => b.currency === cur)
    .reduce((sum, b) => sum + b.amount, 0);

  const pending = balance.pending
    .filter((b) => b.currency === cur)
    .reduce((sum, b) => sum + b.amount, 0);

  return { available, pending, currency: cur, byCurrency };
}

export async function createConnectedPayout(params: {
  stripeAccountId: string;
  amount: number;
  currency: string;
  externalAccountId: string;
  idempotencyKey: string;
  description?: string;
}): Promise<{ payoutId: string; status: string; arrivalDate?: number }> {
  const stripe = getStripe();

  const payout = await stripe.payouts.create(
    {
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      destination: params.externalAccountId,
      description: params.description || "Retrait YouRazz",
    },
    {
      stripeAccount: params.stripeAccountId,
      idempotencyKey: params.idempotencyKey,
    }
  );

  return {
    payoutId: payout.id,
    status: payout.status,
    arrivalDate: payout.arrival_date || undefined,
  };
}

// Transfer plateforme → compte Connect : c'est le maillon qui alimente le
// compte du user avec SON argent (tracké par le wallet interne) avant payout.
export async function createPlatformTransfer(params: {
  stripeAccountId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  userId: string;
}): Promise<{ transferId: string }> {
  const stripe = getStripe();

  const transfer = await stripe.transfers.create(
    {
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      destination: params.stripeAccountId,
      description: "Transfert solde Yourazz",
      metadata: { userId: params.userId },
    },
    { idempotencyKey: params.idempotencyKey }
  );

  return { transferId: transfer.id };
}

export async function reversePlatformTransfer(transferId: string): Promise<void> {
  const stripe = getStripe();
  await stripe.transfers.createReversal(transferId);
}

// Connect status dérivé : not_created | pending_onboarding | restricted | active | disabled
export type ConnectStatus =
  | "not_created"
  | "pending_onboarding"
  | "restricted"
  | "active"
  | "disabled";

export function mapConnectStatus(account: Stripe.Account): ConnectStatus {
  if (account.payouts_enabled && account.charges_enabled) return "active";
  const disabledReason = account.requirements?.disabled_reason || null;
  if (disabledReason) {
    // rejected.* / une raison persistante = compte bloqué ; sinon il manque des infos
    return disabledReason.startsWith("rejected") ? "disabled" : "restricted";
  }
  if (!account.details_submitted) return "pending_onboarding";
  return "restricted";
}

/** Premier compte externe (IBAN) rattaché, s'il existe. */
export function getPrimaryExternalAccount(
  account: Stripe.Account
): { last4?: string; country?: string; currency?: string } | null {
  const ext = account.external_accounts?.data?.[0] as Stripe.BankAccount | undefined;
  if (!ext) return null;
  return {
    last4: ext.last4 || undefined,
    country: ext.country || undefined,
    currency: ext.currency ? ext.currency.toUpperCase() : undefined,
  };
}

export async function getAccountStatus(stripeAccountId: string): Promise<{
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  currentlyDue: string[];
  connectStatus: ConnectStatus;
  disabledReason: string | null;
  country: string | null;
  defaultCurrency: string | null;
  externalAccount: { last4?: string; country?: string; currency?: string } | null;
}> {
  const stripe = getStripe();

  const account = await stripe.accounts.retrieve(stripeAccountId);

  return {
    payoutsEnabled: account.payouts_enabled || false,
    chargesEnabled: account.charges_enabled || false,
    detailsSubmitted: account.details_submitted || false,
    requiresAction: (account.requirements?.currently_due?.length || 0) > 0,
    currentlyDue: account.requirements?.currently_due || [],
    connectStatus: mapConnectStatus(account),
    disabledReason: account.requirements?.disabled_reason || null,
    country: account.country || null,
    defaultCurrency: account.default_currency ? account.default_currency.toUpperCase() : null,
    externalAccount: getPrimaryExternalAccount(account),
  };
}
