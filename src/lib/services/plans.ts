import Stripe from "stripe";
import { db } from "@/lib/db";
import type { PlanTier } from "@prisma/client";

/**
 * Plans tarifaires Yourazz — plafond d'encaissement mensuel par tier.
 *
 * STARTER  : gratuit, 500 €/mois
 * PRO      : 7,99 €/mois, 1 500 €/mois
 * BUSINESS : 19,99 €/mois, illimité
 *
 * Comme accessStatus, User.plan n'est modifié QUE par webhook Stripe
 * (resolvePlanFromSubscription appelé depuis lib/services/access.ts).
 */

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  return new Stripe(key);
}

export const PLANS: Record<
  PlanTier,
  { name: string; monthlyCap: number | null; price: number; lookupKey: string | null }
> = {
  STARTER: { name: "Starter", monthlyCap: 50_000, price: 0, lookupKey: null },
  PRO: { name: "Pro", monthlyCap: 150_000, price: 799, lookupKey: "yourazz_pro_monthly" },
  BUSINESS: { name: "Business", monthlyCap: null, price: 1999, lookupKey: "yourazz_business_monthly" },
};

// L'ancien abonnement unique "Yourazz Access" donne les capacités du plan Pro.
const LEGACY_ACCESS_LOOKUP_KEY = "yourazz_access_monthly";

// Taux indicatifs uniquement pour le CONTRÔLE des plafonds (le crédit wallet
// réel utilise le taux Stripe de la balance_transaction au règlement).
const APPROX_EUR_RATES: Record<string, number> = { EUR: 1, USD: 0.92, GBP: 1.17 };

export function toEurApprox(amount: number, currency: string): number {
  return Math.round(amount * (APPROX_EUR_RATES[currency.toUpperCase()] ?? 1));
}

/** Volume encaissé ce mois-ci (PAYIN non échoués), en équivalent EUR cents. */
export async function getMonthlyVolumeEur(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const grouped = await db.transaction.groupBy({
    by: ["currency"],
    where: {
      userId,
      type: "PAYIN",
      status: { in: ["PENDING", "PROCESSING", "AUTHORIZED", "SUCCEEDED"] },
      createdAt: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });

  return grouped.reduce((sum, g) => sum + toEurApprox(g._sum.amount ?? 0, g.currency), 0);
}

export type PlanCapCheck =
  | { allowed: true; used: number; cap: number | null }
  | { allowed: false; used: number; cap: number; planName: string };

/**
 * Vérifie qu'un nouvel encaissement reste sous le plafond mensuel du plan.
 * Les admins ne sont pas plafonnés.
 */
export async function checkPlanCap(
  receiver: { id: string; plan: PlanTier; role: string },
  amountEurCents: number
): Promise<PlanCapCheck> {
  const isAdmin = receiver.role === "ADMIN" || receiver.role === "ADMIN_OWNER";
  const cap = PLANS[receiver.plan].monthlyCap;
  if (isAdmin || cap === null) return { allowed: true, used: 0, cap: null };

  const used = await getMonthlyVolumeEur(receiver.id);
  if (used + amountEurCents > cap) {
    return { allowed: false, used, cap, planName: PLANS[receiver.plan].name };
  }
  return { allowed: true, used, cap };
}

// ─── Résolution priceId → plan (webhooks) ────────────────────────────────────

let priceIdToPlanCache: Map<string, PlanTier> | null = null;

async function getPriceIdToPlanMap(): Promise<Map<string, PlanTier>> {
  if (priceIdToPlanCache) return priceIdToPlanCache;

  const map = new Map<string, PlanTier>();
  const lookups: { key: string; plan: PlanTier }[] = [
    { key: PLANS.PRO.lookupKey!, plan: "PRO" },
    { key: PLANS.BUSINESS.lookupKey!, plan: "BUSINESS" },
    { key: LEGACY_ACCESS_LOOKUP_KEY, plan: "PRO" },
  ];

  const prices = await getStripe().prices.list({
    lookup_keys: lookups.map((l) => l.key),
    limit: 10,
  });
  for (const price of prices.data) {
    const match = lookups.find((l) => l.key === price.lookup_key);
    if (match) map.set(price.id, match.plan);
  }
  // STRIPE_ACCESS_PRICE_ID (config legacy) → Pro
  if (process.env.STRIPE_ACCESS_PRICE_ID) map.set(process.env.STRIPE_ACCESS_PRICE_ID, "PRO");

  priceIdToPlanCache = map;
  return map;
}

/** Plan correspondant au price d'une subscription Stripe (null si inconnu). */
export async function resolvePlanFromPriceId(priceId: string | null | undefined): Promise<PlanTier | null> {
  if (!priceId) return null;
  try {
    const map = await getPriceIdToPlanMap();
    return map.get(priceId) ?? null;
  } catch (e) {
    console.error("PLAN_RESOLVE_ERROR:", e);
    return null;
  }
}

export async function setUserPlan(userId: string, plan: PlanTier, source: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true, email: true } });
  if (!user || user.plan === plan) return;

  await db.user.update({ where: { id: userId }, data: { plan } });
  await db.auditLog.create({
    data: { userId, action: "PLAN_CHANGED", metadata: { from: user.plan, to: plan, source } },
  });

  if (user.email) {
    import("@/lib/email/plan-notifications").then(({ sendPlanUpgradedEmail }) =>
      sendPlanUpgradedEmail(user.email, plan === "BUSINESS" ? "Business" : "Pro").catch(() => {})
    );
  }
}

// ─── Checkout / upgrade ──────────────────────────────────────────────────────

async function getPlanPriceId(plan: "PRO" | "BUSINESS"): Promise<string> {
  const envKey = process.env[`STRIPE_PRICE_ID_${plan}`];
  if (envKey) return envKey;

  const lookupKey = PLANS[plan].lookupKey!;
  const prices = await getStripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw new Error(`Aucun price Stripe actif avec lookup_key "${lookupKey}". Configurez STRIPE_PRICE_ID_${plan} dans .env ou créez un price avec ce lookup_key dans Stripe.`);
  return price.id;
}

/**
 * Souscription ou changement de plan. Si l'utilisateur a déjà une subscription
 * active, on change le price directement (proration Stripe) ; sinon checkout.
 */
export async function createPlanCheckout(
  userId: string,
  plan: "PRO" | "BUSINESS"
): Promise<{ url: string } | { updated: true }> {
  const stripe = getStripe();
  const [priceId, sub] = await Promise.all([
    getPlanPriceId(plan),
    db.accessSubscription.findUnique({ where: { userId } }),
  ]);

  if (sub?.stripeSubscriptionId && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due")) {
    try {
      const current = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      if (current.status === "active" || current.status === "trialing" || current.status === "past_due") {
        const item = current.items.data[0];
        if (item?.price.id === priceId) return { updated: true };
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          items: [{ id: item.id, price: priceId }],
          proration_behavior: "create_prorations",
          metadata: { purpose: "yourazz_access", userId },
        });
        return { updated: true };
      }
    } catch {
      // Subscription invalide/supprimée dans Stripe — on passe au checkout normal
    }
  }

  const { getOrCreateStripeCustomer } = await import("@/lib/services/access");
  const customerId = await getOrCreateStripeCustomer(userId);
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/dashboard/plan?upgraded=1`,
    cancel_url: `${base}/dashboard/plan`,
    metadata: { purpose: "yourazz_access", userId, plan },
    subscription_data: { metadata: { purpose: "yourazz_access", userId, plan } },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("CHECKOUT_URL_MISSING");
  return { url: session.url };
}

/** Portail de facturation Stripe (factures, moyen de paiement, résiliation). */
export async function createBillingPortal(userId: string): Promise<{ url: string }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (!user?.stripeCustomerId) throw new Error("NO_STRIPE_CUSTOMER");
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";
  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${base}/dashboard/plan`,
  });
  return { url: session.url };
}
