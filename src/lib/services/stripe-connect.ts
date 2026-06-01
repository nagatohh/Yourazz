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
      ip: "0.0.0.0",
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

export async function getConnectedBalance(stripeAccountId: string): Promise<{
  available: number;
  pending: number;
  currency: string;
}> {
  const stripe = getStripe();

  const balance = await stripe.balance.retrieve(
    {},
    { stripeAccount: stripeAccountId }
  );

  const available = balance.available
    .filter((b) => b.currency === "eur")
    .reduce((sum, b) => sum + b.amount, 0);

  const pending = balance.pending
    .filter((b) => b.currency === "eur")
    .reduce((sum, b) => sum + b.amount, 0);

  return { available, pending, currency: "eur" };
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

export async function getAccountStatus(stripeAccountId: string): Promise<{
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  currentlyDue: string[];
}> {
  const stripe = getStripe();

  const account = await stripe.accounts.retrieve(stripeAccountId);

  return {
    payoutsEnabled: account.payouts_enabled || false,
    chargesEnabled: account.charges_enabled || false,
    detailsSubmitted: account.details_submitted || false,
    requiresAction: (account.requirements?.currently_due?.length || 0) > 0,
    currentlyDue: account.requirements?.currently_due || [],
  };
}
