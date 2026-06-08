import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [recentWebhooks, lastSucceeded, pendingTx, wallet] = await Promise.all([
    db.webhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        eventType: true,
        eventId: true,
        processed: true,
        error: true,
        attempts: true,
        createdAt: true,
      },
    }),
    db.transaction.findFirst({
      where: { status: "SUCCEEDED", type: "PAYIN" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, amount: true, updatedAt: true, providerTransactionId: true },
    }),
    db.transaction.findMany({
      where: { status: "PENDING", type: "PAYIN" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, amount: true, createdAt: true, providerTransactionId: true, payerName: true },
    }),
    db.wallet.findFirst({
      where: { userId: admin.userId },
      select: { availableBalance: true, pendingBalance: true },
    }),
  ]);

  return NextResponse.json({
    wallet,
    lastSucceededPayment: lastSucceeded,
    pendingTransactions: pendingTx,
    recentWebhooks,
    diagnosis: recentWebhooks.length === 0
      ? "AUCUN webhook reçu — vérifie l'URL et le secret dans Stripe Dashboard"
      : recentWebhooks.some((w) => w.error)
        ? "Webhooks avec erreurs détectés"
        : pendingTx.length > 0 && recentWebhooks.every((w) => w.eventType !== "payment_intent.succeeded")
          ? "Webhooks reçus mais aucun payment_intent.succeeded — vérifie les événements activés dans Stripe"
          : "Webhooks OK",
  });
}
