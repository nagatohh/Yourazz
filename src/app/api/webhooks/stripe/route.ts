import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { confirmPayin, failPayin } from "@/lib/services/ledger";
import { confirmEvidence, failEvidence, handleDispute } from "@/lib/services/chargeback-defender";

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
        const chargeId = obj.latest_charge || obj.charges?.data?.[0]?.id;
        await confirmEvidence(obj.id, chargeId);
        if (result) {
          const tx = await db.transaction.findUnique({ where: { providerTransactionId: obj.id } });
          if (tx) {
            const charges = obj.charges?.data || obj.latest_charge ? [obj.latest_charge] : [];
            const charge = charges[0];
            const walletType = charge?.payment_method_details?.type;
            const cardWallet = charge?.payment_method_details?.card?.wallet?.type;
            let method = tx.paymentMethod;
            if (cardWallet === "apple_pay") method = "APPLE_PAY";
            else if (cardWallet === "google_pay") method = "GOOGLE_PAY";
            else if (walletType === "revolut_pay") method = "REVOLUT_PAY";
            else if (walletType === "paypal") method = "PAYPAL";
            if (method !== tx.paymentMethod) {
              await db.transaction.update({ where: { id: tx.id }, data: { paymentMethod: method } });
            }
          }
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
          // Notification au vendeur — Stripe peut rejouer l'évènement si la
          // requête échoue après l'envoi, d'où la déduplication via EmailLog
          // (la référence #orderId fait partie du sujet).
          if (tx) {
            try {
              const merchant = await db.user.findUnique({
                where: { id: tx.userId },
                select: { email: true },
              });
              if (merchant) {
                const orderId = tx.id.slice(-8).toUpperCase();
                const alreadyNotified = await db.emailLog.findFirst({
                  where: {
                    template: "payment_received",
                    toEmail: merchant.email,
                    subject: { contains: `#${orderId}` },
                  },
                  select: { id: true },
                });
                if (!alreadyNotified) {
                  const { sendPaymentReceivedNotification } = await import("@/lib/email");
                  await sendPaymentReceivedNotification(merchant.email, {
                    amount: tx.amount,
                    currency: tx.currency,
                    transactionId: tx.id,
                    payerName: tx.payerName || undefined,
                    payerEmail: tx.payerEmail || undefined,
                    paymentMethod: tx.paymentMethod || undefined,
                    date: tx.createdAt,
                  });
                }
              }
            } catch (notifErr) {
              console.error("MERCHANT_NOTIF_ERROR:", notifErr);
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

      case "payment_intent.canceled": {
        await failPayin({ providerTxId: obj.id, reason: "Paiement annulé" });
        await failEvidence(obj.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const reason = obj.last_payment_error?.message || "Paiement refuse";
        await failPayin({ providerTxId: obj.id, reason });
        await failEvidence(obj.id);
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
        await handleDispute({
          stripeDisputeId: obj.id,
          stripeChargeId: obj.charge,
          amount: obj.amount,
          currency: obj.currency?.toUpperCase(),
          reason: obj.reason,
          status: obj.status,
          evidenceDueBy: obj.evidence_details?.due_by
            ? new Date(obj.evidence_details.due_by * 1000)
            : undefined,
        });
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

      case "charge.dispute.updated": {
        await handleDispute({
          stripeDisputeId: obj.id,
          stripeChargeId: obj.charge,
          amount: obj.amount,
          currency: obj.currency?.toUpperCase(),
          reason: obj.reason,
          status: obj.status,
          evidenceDueBy: obj.evidence_details?.due_by
            ? new Date(obj.evidence_details.due_by * 1000)
            : undefined,
        });
        break;
      }

      case "charge.dispute.closed": {
        await handleDispute({
          stripeDisputeId: obj.id,
          stripeChargeId: obj.charge,
          amount: obj.amount,
          currency: obj.currency?.toUpperCase(),
          reason: obj.reason,
          status: obj.status,
        });
        break;
      }

      case "payout.paid": {
        const payout = await db.payout.findUnique({ where: { providerPayoutId: obj.id } });
        if (payout && payout.status !== "PAID") {
          await db.payout.update({
            where: { id: payout.id },
            data: { status: "PAID" },
          });
          await db.auditLog.create({
            data: { userId: payout.userId, action: "PAYOUT_PAID", target: payout.id },
          });
        }
        break;
      }

      case "payout.failed": {
        const payout = await db.payout.findUnique({ where: { providerPayoutId: obj.id } });
        if (payout && payout.status !== "FAILED") {
          await db.payout.update({
            where: { id: payout.id },
            data: { status: "FAILED", failureReason: obj.failure_message || obj.failure_code || "Échec du retrait" },
          });
          await db.auditLog.create({
            data: {
              userId: payout.userId,
              action: "PAYOUT_FAILED",
              target: payout.id,
              metadata: { reason: obj.failure_message, code: obj.failure_code },
            },
          });
        }
        break;
      }

      case "payout.canceled": {
        const payout = await db.payout.findUnique({ where: { providerPayoutId: obj.id } });
        if (payout && payout.status !== "CANCELLED") {
          await db.payout.update({
            where: { id: payout.id },
            data: { status: "CANCELLED" },
          });
          await db.auditLog.create({
            data: { userId: payout.userId, action: "PAYOUT_CANCELLED", target: payout.id },
          });
        }
        break;
      }

      case "account.updated": {
        const accountId = obj.id as string;
        const user = await db.user.findFirst({ where: { stripeAccountId: accountId } });
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              payoutsEnabled: obj.payouts_enabled || false,
              stripeOnboarded: obj.details_submitted || false,
            },
          });
        }
        break;
      }

      case "account.external_account.created":
      case "account.external_account.updated": {
        const bankAccountStripeId = obj.id as string;
        const bankAccount = await db.bankAccount.findFirst({
          where: { providerBankAccountId: bankAccountStripeId },
        });
        if (bankAccount) {
          const newStatus = obj.status === "verified" ? "VERIFIED" : obj.status === "errored" ? "REJECTED" : "PENDING";
          await db.bankAccount.update({
            where: { id: bankAccount.id },
            data: { status: newStatus as any, bankName: obj.bank_name || bankAccount.bankName },
          });
        }
        break;
      }

      case "account.external_account.deleted": {
        const deletedId = obj.id as string;
        await db.bankAccount.deleteMany({ where: { providerBankAccountId: deletedId } });
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
