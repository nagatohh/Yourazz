import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { confirmPayin, failPayin, confirmPayout, failPayout } from "@/lib/services/ledger";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    const provider = getPaymentProvider();
    const verification = await provider.verifyWebhook(headers, body);

    if (!verification.isValid) {
      await db.securityLog.create({
        data: { action: "WEBHOOK_INVALID_SIGNATURE", severity: "WARNING", metadata: { provider: provider.name } },
      });
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    const eventId = verification.eventId || crypto.randomUUID();
    const existingEvent = await db.webhookEvent.findUnique({ where: { eventId } });
    if (existingEvent?.processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const event = await db.webhookEvent.upsert({
      where: { eventId },
      create: {
        provider: provider.name,
        eventType: verification.eventType || "unknown",
        eventId,
        payload: body,
      },
      update: { attempts: { increment: 1 } },
    });

    const payload = verification.payload as any;
    const providerTxId: string | null = payload?.id || payload?.providerTxId || null;

    if (verification.eventType === "payment.succeeded" && providerTxId) {
      await confirmPayin({ providerTxId, provider: provider.name });
    }

    if (verification.eventType === "payment.failed" && providerTxId) {
      const reason = payload?.failure?.message || payload?.reason || "Paiement refusé";
      await failPayin({ providerTxId, reason });
    }

    if (verification.eventType === "payout.paid" && providerTxId) {
      await confirmPayout(providerTxId);
    }

    if (verification.eventType === "payout.failed" && providerTxId) {
      const reason = payload?.failure?.message || payload?.reason || "Retrait échoué";
      await failPayout(providerTxId, reason);
    }

    await db.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("WEBHOOK_ERROR:", e);
    return NextResponse.json({ error: "Erreur webhook" }, { status: 500 });
  }
}
