import Stripe from "stripe";
import { db } from "@/lib/db";

/**
 * Yourazz Access — abonnement mensuel donnant accès à la plateforme.
 *
 * Règle absolue : User.accessStatus n'est modifié QUE par les handlers
 * webhook de ce fichier (évènements Stripe signés). Jamais depuis une
 * redirection success_url, qui peut être forgée par n'importe qui.
 */

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  return new Stripe(key);
}

const PRICE_LOOKUP_KEY = "yourazz_access_monthly";
let cachedPriceId: string | null = null;

// STRIPE_ACCESS_PRICE_ID prioritaire, sinon résolution par lookup_key —
// évite toute config Vercel : le price est retrouvé via l'API et mis en cache.
export async function getAccessPriceId(): Promise<string> {
  if (process.env.STRIPE_ACCESS_PRICE_ID) return process.env.STRIPE_ACCESS_PRICE_ID;
  if (cachedPriceId) return cachedPriceId;

  const prices = await getStripe().prices.list({
    lookup_keys: [PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) throw new Error(`Aucun price Stripe actif avec lookup_key "${PRICE_LOOKUP_KEY}"`);
  cachedPriceId = price.id;
  return cachedPriceId;
}

export async function getAccessPrice(): Promise<{ amount: number; currency: string; interval: string }> {
  const priceId = await getAccessPriceId();
  const price = await getStripe().prices.retrieve(priceId);
  return {
    amount: price.unit_amount ?? 0,
    currency: (price.currency ?? "eur").toUpperCase(),
    interval: price.recurring?.interval ?? "month",
  };
}

export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id, purpose: "yourazz_access" },
  });

  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function createAccessCheckout(userId: string): Promise<{ url: string }> {
  const [customerId, priceId] = await Promise.all([
    getOrCreateStripeCustomer(userId),
    getAccessPriceId(),
  ]);
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/access/success`,
    cancel_url: `${base}/access/payment`,
    metadata: { purpose: "yourazz_access", userId },
    subscription_data: { metadata: { purpose: "yourazz_access", userId } },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("CHECKOUT_URL_MISSING");
  return { url: session.url };
}

// ─── WEBHOOK HANDLERS ────────────────────────────────────────────────────────

async function setAccessStatus(userId: string, status: "ACTIVE" | "PAST_DUE" | "CANCELED", source: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { accessStatus: true } });
  if (!user || user.accessStatus === status) return;

  await db.user.update({ where: { id: userId }, data: { accessStatus: status } });
  await db.auditLog.create({
    data: {
      userId,
      action: status === "ACTIVE" ? "ACCESS_ACTIVATED" : status === "PAST_DUE" ? "ACCESS_PAST_DUE" : "ACCESS_CANCELED",
      metadata: { source },
    },
  });
}

// Retrouve le user d'une subscription : metadata d'abord, puis la table locale.
async function resolveUserFromSubscription(sub: any): Promise<string | null> {
  if (sub?.metadata?.userId) return sub.metadata.userId;
  const subId = typeof sub === "string" ? sub : sub?.id;
  if (!subId) return null;
  const local = await db.accessSubscription.findUnique({
    where: { stripeSubscriptionId: subId },
    select: { userId: true },
  });
  return local?.userId ?? null;
}

export async function handleAccessCheckoutCompleted(session: any) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("ACCESS_CHECKOUT: metadata.userId manquant", session.id);
    return;
  }

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? "";

  await db.accessSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: session.payment_status === "paid" ? "active" : "incomplete",
    },
    update: {
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscriptionId,
      status: session.payment_status === "paid" ? "active" : "incomplete",
    },
  });

  await db.accessPayment.upsert({
    where: { stripeCheckoutSessionId: session.id },
    create: {
      userId,
      stripeCheckoutSessionId: session.id,
      amount: session.amount_total ?? 0,
      currency: (session.currency ?? "eur").toUpperCase(),
      status: session.payment_status === "paid" ? "succeeded" : "pending",
    },
    update: { status: session.payment_status === "paid" ? "succeeded" : "pending" },
  });

  // Activation seulement si le paiement est confirmé dans l'évènement signé.
  // Sinon invoice.paid prendra le relais.
  if (session.payment_status === "paid") {
    await setAccessStatus(userId, "ACTIVE", "checkout.session.completed");

    // Plan choisi au checkout (metadata posée par createPlanCheckout) ;
    // un checkout legacy sans metadata.plan correspond à l'ancien
    // abonnement unique → capacités Pro.
    const { setUserPlan } = await import("@/lib/services/plans");
    const plan = session.metadata?.plan === "BUSINESS" ? "BUSINESS" : "PRO";
    await setUserPlan(userId, plan, "checkout.session.completed");
  }
}

export async function handleAccessInvoicePaid(invoice: any) {
  // Selon la version d'API, la subscription est à plat ou sous parent.*
  const subRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
  const subMeta = invoice.subscription_details?.metadata ?? invoice.parent?.subscription_details?.metadata ?? null;
  const userId = subMeta?.userId ?? (subRef ? await resolveUserFromSubscription(subRef) : null);
  if (!userId) return;

  const period = invoice.lines?.data?.[0]?.period;
  const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
  const invoicePriceId =
    invoice.lines?.data?.[0]?.price?.id ?? invoice.lines?.data?.[0]?.pricing?.price_details?.price ?? null;

  await db.accessSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "",
      stripeSubscriptionId: subscriptionId,
      status: "active",
      currentPeriodStart: period?.start ? new Date(period.start * 1000) : null,
      currentPeriodEnd: period?.end ? new Date(period.end * 1000) : null,
    },
    update: {
      status: "active",
      stripeSubscriptionId: subscriptionId ?? undefined,
      priceId: invoicePriceId ?? undefined,
      currentPeriodStart: period?.start ? new Date(period.start * 1000) : undefined,
      currentPeriodEnd: period?.end ? new Date(period.end * 1000) : undefined,
    },
  });

  if (invoicePriceId) {
    const { resolvePlanFromPriceId, setUserPlan } = await import("@/lib/services/plans");
    const plan = await resolvePlanFromPriceId(invoicePriceId);
    if (plan) await setUserPlan(userId, plan, "invoice.paid");
  }

  if (invoice.id) {
    await db.accessPayment.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        userId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid ?? 0,
        currency: (invoice.currency ?? "eur").toUpperCase(),
        status: "succeeded",
      },
      update: { status: "succeeded" },
    });
  }

  await setAccessStatus(userId, "ACTIVE", "invoice.paid");
}

export async function handleAccessInvoiceFailed(invoice: any) {
  const subRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
  const subMeta = invoice.subscription_details?.metadata ?? invoice.parent?.subscription_details?.metadata ?? null;
  const userId = subMeta?.userId ?? (subRef ? await resolveUserFromSubscription(subRef) : null);
  if (!userId) return;

  await db.accessSubscription.updateMany({
    where: { userId },
    data: { status: "past_due" },
  });
  await setAccessStatus(userId, "PAST_DUE", "invoice.payment_failed");
}

export async function handleAccessSubscriptionUpdated(sub: any) {
  if (sub?.metadata?.purpose !== "yourazz_access") {
    // Subscription inconnue (autre produit) — vérifier quand même la table locale
    const known = await db.accessSubscription.findUnique({ where: { stripeSubscriptionId: sub.id }, select: { id: true } });
    if (!known) return;
  }
  const userId = await resolveUserFromSubscription(sub);
  if (!userId) return;

  const periodStart = sub.current_period_start ?? sub.items?.data?.[0]?.current_period_start ?? null;
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;

  await db.accessSubscription.updateMany({
    where: { userId },
    data: {
      status: sub.status,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
  });

  const { resolvePlanFromPriceId, setUserPlan } = await import("@/lib/services/plans");
  const subPriceId = sub.items?.data?.[0]?.price?.id ?? null;

  if (sub.status === "active" || sub.status === "trialing") {
    await setAccessStatus(userId, "ACTIVE", `subscription.${sub.status}`);
    const plan = await resolvePlanFromPriceId(subPriceId);
    if (plan) await setUserPlan(userId, plan, `subscription.${sub.status}`);
  } else if (sub.status === "past_due" || sub.status === "unpaid") {
    await setAccessStatus(userId, "PAST_DUE", `subscription.${sub.status}`);
  } else if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    await setAccessStatus(userId, "CANCELED", `subscription.${sub.status}`);
    await setUserPlan(userId, "STARTER", `subscription.${sub.status}`);
  }
}

export async function handleAccessSubscriptionDeleted(sub: any) {
  const userId = await resolveUserFromSubscription(sub);
  if (!userId) return;

  await db.accessSubscription.updateMany({
    where: { userId },
    data: { status: "canceled", canceledAt: new Date() },
  });
  await setAccessStatus(userId, "CANCELED", "customer.subscription.deleted");

  const { setUserPlan } = await import("@/lib/services/plans");
  await setUserPlan(userId, "STARTER", "customer.subscription.deleted");
}
