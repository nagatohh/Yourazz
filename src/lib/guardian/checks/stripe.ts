import { db } from "@/lib/db";
import type { CheckResult, IssueFound } from "../types";

export async function stripeHealthCheck(): Promise<CheckResult> {
  const start = Date.now();
  const issues: IssueFound[] = [];

  // Check env vars
  if (!process.env.STRIPE_SECRET_KEY) {
    issues.push({
      type: "STRIPE_KEY_MISSING",
      severity: "CRITICAL",
      title: "STRIPE_SECRET_KEY manquante",
      source: "stripe",
      autoRepairable: false,
    });
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    issues.push({
      type: "STRIPE_PK_MISSING",
      severity: "CRITICAL",
      title: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante",
      source: "stripe",
      autoRepairable: false,
    });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    issues.push({
      type: "STRIPE_WEBHOOK_SECRET_MISSING",
      severity: "ERROR",
      title: "STRIPE_WEBHOOK_SECRET manquante — webhooks non verifies",
      source: "stripe",
      autoRepairable: false,
    });
  }

  // Check unprocessed webhooks
  const unprocessed = await db.webhookEvent.count({
    where: { processed: false, createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
  });

  if (unprocessed > 0) {
    issues.push({
      type: "WEBHOOKS_UNPROCESSED",
      severity: unprocessed > 10 ? "ERROR" : "WARNING",
      title: `${unprocessed} webhook(s) non traite(s) depuis +5min`,
      source: "stripe",
      metadata: { count: unprocessed },
      autoRepairable: true,
    });
  }

  // Check failed webhooks
  const failedWebhooks = await db.webhookEvent.count({
    where: { error: { not: null } },
  });

  if (failedWebhooks > 0) {
    issues.push({
      type: "WEBHOOKS_FAILED",
      severity: "WARNING",
      title: `${failedWebhooks} webhook(s) en erreur`,
      source: "stripe",
      metadata: { count: failedWebhooks },
      autoRepairable: false,
    });
  }

  // Test Stripe API connectivity
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.balance.retrieve();
    } catch (e) {
      issues.push({
        type: "STRIPE_API_UNREACHABLE",
        severity: "CRITICAL",
        title: "API Stripe inaccessible",
        description: (e as Error).message,
        source: "stripe",
        autoRepairable: false,
      });
    }
  }

  const hasCritical = issues.some((i) => i.severity === "CRITICAL");
  const hasError = issues.some((i) => i.severity === "ERROR");

  return {
    type: "STRIPE",
    status: hasCritical ? "BROKEN" : hasError ? "DEGRADED" : issues.length > 0 ? "DEGRADED" : "HEALTHY",
    severity: hasCritical ? "CRITICAL" : hasError ? "ERROR" : issues.length > 0 ? "WARNING" : "INFO",
    message: issues.length === 0 ? "Stripe OK" : `${issues.length} probleme(s)`,
    details: { unprocessed, failedWebhooks },
    issues,
    durationMs: Date.now() - start,
  };
}
