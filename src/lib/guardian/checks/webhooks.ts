import { db } from "@/lib/db";
import type { CheckResult, IssueFound } from "../types";

export async function webhookConsistencyCheck(): Promise<CheckResult> {
  const start = Date.now();
  const issues: IssueFound[] = [];

  // Check unprocessed webhooks older than 5 minutes
  const staleUnprocessed = await db.webhookEvent.findMany({
    where: {
      processed: false,
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (staleUnprocessed.length > 0) {
    issues.push({
      type: "WEBHOOKS_STALE_UNPROCESSED",
      severity: staleUnprocessed.length > 10 ? "ERROR" : "WARNING",
      title: `${staleUnprocessed.length} webhook(s) non traite(s) depuis +5min`,
      source: "webhooks",
      metadata: {
        count: staleUnprocessed.length,
        oldest: staleUnprocessed[staleUnprocessed.length - 1]?.createdAt,
        ids: staleUnprocessed.slice(0, 5).map((w) => w.id),
      },
      autoRepairable: true,
    });
  }

  // Check webhooks with errors
  const failedWebhooks = await db.webhookEvent.findMany({
    where: { error: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (failedWebhooks.length > 0) {
    issues.push({
      type: "WEBHOOKS_WITH_ERRORS",
      severity: failedWebhooks.length > 5 ? "ERROR" : "WARNING",
      title: `${failedWebhooks.length} webhook(s) en erreur`,
      source: "webhooks",
      metadata: {
        count: failedWebhooks.length,
        recentErrors: failedWebhooks.slice(0, 3).map((w) => ({
          id: w.id,
          type: w.eventType,
          error: w.error,
        })),
      },
      autoRepairable: false,
    });
  }

  // Check for duplicate webhook events (same eventId)
  const duplicates = await db.$queryRaw<{ eventId: string; cnt: bigint }[]>`
    SELECT "eventId", COUNT(*) as cnt
    FROM "WebhookEvent"
    GROUP BY "eventId"
    HAVING COUNT(*) > 1
    LIMIT 10
  `;

  if (duplicates.length > 0) {
    issues.push({
      type: "WEBHOOKS_DUPLICATES",
      severity: "WARNING",
      title: `${duplicates.length} event(s) Stripe duplique(s)`,
      source: "webhooks",
      metadata: {
        duplicates: duplicates.map((d) => ({
          eventId: d.eventId,
          count: Number(d.cnt),
        })),
      },
      autoRepairable: false,
    });
  }

  // Check payment_intent.succeeded without matching SUCCEEDED transaction
  const recentSucceeded = await db.webhookEvent.findMany({
    where: {
      eventType: "payment_intent.succeeded",
      processed: true,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  for (const webhook of recentSucceeded) {
    const payload = webhook.payload as { id?: string } | null;
    if (!payload?.id) continue;

    const tx = await db.transaction.findFirst({
      where: { providerTransactionId: payload.id, status: "SUCCEEDED" },
    });

    if (!tx) {
      issues.push({
        type: "WEBHOOK_NO_MATCHING_TX",
        severity: "ERROR",
        title: `PaymentIntent ${payload.id} succeeded mais pas de transaction SUCCEEDED`,
        source: "webhooks",
        metadata: {
          webhookId: webhook.id,
          stripePaymentIntentId: payload.id,
        },
        autoRepairable: false,
      });
    }
  }

  const hasCritical = issues.some((i) => i.severity === "CRITICAL" || i.severity === "ERROR");

  return {
    type: "WEBHOOKS",
    status: hasCritical ? "BROKEN" : issues.length > 0 ? "DEGRADED" : "HEALTHY",
    severity: hasCritical ? "ERROR" : issues.length > 0 ? "WARNING" : "INFO",
    message: issues.length === 0
      ? "Webhooks OK"
      : `${issues.length} probleme(s) webhook detecte(s)`,
    details: { staleCount: staleUnprocessed.length, failedCount: failedWebhooks.length },
    issues,
    durationMs: Date.now() - start,
  };
}
