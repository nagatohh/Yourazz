import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { confirmPayin, failPayin } from "@/lib/services/ledger";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !secret) {
      console.error("STRIPE_WEBHOOK: Missing signature or secret");
      return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
    } catch (err) {
      await db.securityLog.create({
        data: { action: "STRIPE_WEBHOOK_INVALID_SIGNATURE", severity: "WARNING" },
      });
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    // Idempotency: skip already processed events
    const existing = await db.webhookEvent.findUnique({ where: { eventId: event.id } });
    if (existing?.processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Upsert webhook event record
    await db.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        provider: "stripe",
        eventType: event.type,
        eventId: event.id,
        payload: JSON.stringify(event.data.object),
      },
      update: { attempts: { increment: 1 } },
    });

    const obj = event.data.object as any;

    switch (event.type) {
      case "payment_intent.succeeded": {
        const result = await confirmPayin({ providerTxId: obj.id, provider: "stripe" });
        if (result) {
          // Send receipt if needed
          const tx = await db.transaction.findUnique({ where: { providerTransactionId: obj.id } });
          if (tx?.payerEmail && !tx.receiptSent) {
            try {
              const { sendPaymentReceipt } = await import("@/lib/email");
              await sendPaymentReceipt(tx.payerEmail, {
                amount: tx.amount,
                currency: tx.currency,
                transactionId: tx.id,
                payerName: tx.payerName || undefined,
                description: tx.description || undefined,
                paymentMethod: tx.paymentMethod || undefined,
                date: tx.createdAt,
              });
              await db.transaction.update({ where: { id: tx.id }, data: { receiptSent: true } });
            } catch (emailErr) {
              console.error("RECEIPT_EMAIL_ERROR:", emailErr);
            }
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const paymentIntent = obj.payment_intent as string;
        if (paymentIntent) {
          await confirmPayin({ providerTxId: paymentIntent, provider: "stripe" });
        }
        break;
      }

      case "checkout.session.expired": {
        const pi = obj.payment_intent as string;
        if (pi) {
          await failPayin({ providerTxId: pi, reason: "Session expirée" });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const reason = obj.last_payment_error?.message || "Paiement refuse";
        await failPayin({ providerTxId: obj.id, reason });
        break;
      }

      case "charge.refunded": {
        const txId = obj.payment_intent as string;
        if (txId) {
          const tx = await db.transaction.findUnique({ where: { providerTransactionId: txId } });
          if (tx && tx.status === "SUCCEEDED") {
            await db.$transaction(async (prisma) => {
              await prisma.transaction.update({
                where: { id: tx.id },
                data: { status: "REFUNDED", refundedAt: new Date() },
              });
              await prisma.wallet.update({
                where: { id: tx.walletId },
                data: { availableBalance: { decrement: tx.netAmount } },
              });
              await prisma.auditLog.create({
                data: {
                  userId: tx.userId,
                  action: "PAYMENT_REFUNDED",
                  target: tx.id,
                  metadata: { amount: obj.amount_refunded },
                },
              });
            });
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const txId = obj.payment_intent as string;
        if (txId) {
          const tx = await db.transaction.findUnique({ where: { providerTransactionId: txId } });
          if (tx) {
            await db.securityLog.create({
              data: {
                userId: tx.userId,
                action: "DISPUTE_OPENED",
                severity: "CRITICAL",
                metadata: { transactionId: tx.id, amount: obj.amount, reason: obj.reason },
              },
            });
          }
        }
        break;
      }
    }

    // Mark as processed
    await db.webhookEvent.update({
      where: { eventId: event.id },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("STRIPE_WEBHOOK_ERROR:", e);
    return NextResponse.json({ error: "Erreur webhook" }, { status: 500 });
  }
}
