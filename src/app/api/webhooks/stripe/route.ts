import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { confirmPayin, failPayin, confirmPayout, failPayout } from "@/lib/services/ledger";
import { confirmEvidence, failEvidence, handleDispute } from "@/lib/services/chargeback-defender";
import {
  reversePlatformTransfer,
  mapConnectStatus,
  getPrimaryExternalAccount,
} from "@/lib/services/stripe-connect";
import { createNotification } from "@/lib/services/notifications";
import { toEurApprox } from "@/lib/services/plans";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    // Deux endpoints Stripe pointent ici : "votre compte" (paiements, abonnements)
    // et "comptes connectés" (payouts des users, account.updated). Chacun a son
    // propre secret de signature — on essaie les deux.
    const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
      (s): s is string => !!s
    );

    if (!sig || secrets.length === 0) {
      console.error("STRIPE_WEBHOOK: Missing signature or secret");
      return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
    }

    let event: Stripe.Event | null = null;
    for (const secret of secrets) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, secret);
        break;
      } catch {
        // mauvais secret pour cet endpoint — on tente le suivant
      }
    }
    if (!event) {
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
        // Paiement non-EUR : figer la conversion AVANT le crédit wallet.
        // Le wallet est tenu en EUR — on utilise le montant réellement réglé
        // par Stripe (balance_transaction) plutôt qu'un taux approximatif.
        const pendingTx = await db.transaction.findUnique({ where: { providerTransactionId: obj.id } });
        if (
          pendingTx &&
          pendingTx.currency !== "EUR" &&
          (pendingTx.status === "PENDING" || pendingTx.status === "AUTHORIZED")
        ) {
          const chargeIdForFx = typeof obj.latest_charge === "string" ? obj.latest_charge : obj.latest_charge?.id;
          if (!chargeIdForFx) throw new Error(`FX: charge manquante pour ${obj.id}`);
          const fxCharge = await stripe.charges.retrieve(chargeIdForFx, { expand: ["balance_transaction"] });
          const bt = fxCharge.balance_transaction as Stripe.BalanceTransaction | null;
          if (!bt) throw new Error(`FX: balance_transaction manquante pour ${obj.id}`);

          // Si le règlement n'est pas en EUR (cas anormal), taux indicatif en secours
          const eurGross = bt.currency.toUpperCase() === "EUR"
            ? bt.amount
            : toEurApprox(pendingTx.amount, pendingTx.currency);
          const fxFees = Math.round((eurGross * 150) / 10000);

          await db.transaction.update({
            where: { id: pendingTx.id },
            data: {
              amount: eurGross,
              fees: fxFees,
              netAmount: eurGross - fxFees,
              currency: "EUR",
              metadata: {
                ...((pendingTx.metadata as object) || {}),
                fx: {
                  originalAmount: pendingTx.amount,
                  originalCurrency: pendingTx.currency,
                  exchangeRate: bt.exchange_rate,
                },
              },
            },
          });
        }

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
              // Le reçu du payeur affiche le montant dans SA devise d'origine
              const fx = (tx.metadata as any)?.fx;
              const { sendPaymentReceipt } = await import("@/lib/email");
              await sendPaymentReceipt(tx.payerEmail, {
                amount: fx?.originalAmount ?? tx.amount,
                currency: fx?.originalCurrency ?? tx.currency,
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
                  await createNotification({
                    userId: tx.userId,
                    type: "PAYMENT_RECEIVED",
                    title: `Paiement reçu : ${(tx.netAmount / 100).toFixed(2)} €`,
                    body: tx.payerName
                      ? `${tx.payerName} vient de vous payer. Le montant net est disponible sur votre solde.`
                      : "Un paiement vient d'être crédité sur votre solde.",
                    href: "/dashboard/transactions",
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
        // Abonnement Yourazz Access vs paiement client : deux mondes distincts
        if (obj.mode === "subscription" || obj.metadata?.purpose === "yourazz_access") {
          const { handleAccessCheckoutCompleted } = await import("@/lib/services/access");
          await handleAccessCheckoutCompleted(obj);
          break;
        }
        const paymentIntent = obj.payment_intent as string;
        if (paymentIntent) {
          await confirmPayin({ providerTxId: paymentIntent, provider: "stripe" });
        }
        break;
      }

      case "invoice.paid": {
        const { handleAccessInvoicePaid } = await import("@/lib/services/access");
        await handleAccessInvoicePaid(obj);
        break;
      }

      case "invoice.payment_failed": {
        const { handleAccessInvoiceFailed } = await import("@/lib/services/access");
        await handleAccessInvoiceFailed(obj);
        break;
      }

      case "customer.subscription.updated": {
        const { handleAccessSubscriptionUpdated } = await import("@/lib/services/access");
        await handleAccessSubscriptionUpdated(obj);
        break;
      }

      case "customer.subscription.deleted": {
        const { handleAccessSubscriptionDeleted } = await import("@/lib/services/access");
        await handleAccessSubscriptionDeleted(obj);
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
        // Ledger : payout PAID + transaction SUCCEEDED, idempotent
        const paidPayout = await confirmPayout(obj.id);

        // Notification temps réel au vendeur — déduplication via EmailLog
        // (Stripe peut rejouer l'évènement), la réf #ID fait partie du sujet.
        if (paidPayout) {
          try {
            const [payoutUser, payoutBank] = await Promise.all([
              db.user.findUnique({ where: { id: paidPayout.userId }, select: { email: true } }),
              db.bankAccount.findUnique({ where: { id: paidPayout.bankAccountId }, select: { ibanMasked: true, bankName: true } }),
            ]);
            if (payoutUser) {
              const ref = paidPayout.id.slice(-8).toUpperCase();
              const alreadySent = await db.emailLog.findFirst({
                where: { template: "payout_confirmed", toEmail: payoutUser.email, subject: { contains: `#${ref}` } },
                select: { id: true },
              });
              if (!alreadySent) {
                const { sendPayoutConfirmedEmail } = await import("@/lib/email");
                await sendPayoutConfirmedEmail(payoutUser.email, {
                  amount: paidPayout.amount,
                  currency: paidPayout.currency,
                  payoutId: paidPayout.id,
                  bankLabel: payoutBank ? `${payoutBank.bankName ? payoutBank.bankName + " " : ""}${payoutBank.ibanMasked}` : undefined,
                  date: new Date(),
                });
                await createNotification({
                  userId: paidPayout.userId,
                  type: "PAYOUT_CONFIRMED",
                  title: `Retrait de ${(paidPayout.amount / 100).toFixed(2)} € confirmé`,
                  body: "Le virement vers votre compte bancaire a été émis. Réception sous 1 à 2 jours ouvrés.",
                  href: "/dashboard/payouts",
                });
              }
            }
          } catch (payoutNotifErr) {
            console.error("PAYOUT_NOTIF_ERROR:", payoutNotifErr);
          }
        }
        break;
      }

      case "payout.failed":
      case "payout.canceled": {
        const reason = obj.failure_message || obj.failure_code || (event.type === "payout.canceled" ? "Retrait annulé" : "Échec du retrait");

        // failPayout est idempotent : il re-crédite le wallet seulement à la
        // première transition. Le payout retourné porte l'ANCIEN statut, ce qui
        // permet de savoir si cette invocation a réellement fait la transition.
        const before = await failPayout(obj.id, reason);
        const didTransition = before && before.status !== "FAILED";

        // Notification temps réel au vendeur (uniquement à la vraie transition)
        if (didTransition && before) {
          try {
            const failedUser = await db.user.findUnique({ where: { id: before.userId }, select: { email: true } });
            if (failedUser) {
              const { sendPayoutFailedEmail } = await import("@/lib/email");
              await sendPayoutFailedEmail(failedUser.email, {
                amount: before.amount,
                currency: before.currency,
                payoutId: before.id,
                reason,
                date: new Date(),
              });
              await createNotification({
                userId: before.userId,
                type: "PAYOUT_FAILED",
                title: `Retrait de ${(before.amount / 100).toFixed(2)} € échoué`,
                body: "Le montant a été re-crédité sur votre solde. Vérifiez votre IBAN puis relancez le retrait.",
                href: "/dashboard/payouts",
              });
            }
          } catch (payoutFailNotifErr) {
            console.error("PAYOUT_FAIL_NOTIF_ERROR:", payoutFailNotifErr);
          }
        }

        // L'argent était déjà sur le compte Connect du user (transfer fait au
        // moment du retrait) : on le ramène sur la plateforme pour rester
        // cohérent avec le wallet re-crédité.
        if (didTransition) {
          const tx = await db.transaction.findUnique({ where: { providerTransactionId: obj.id } });
          const transferId = (tx?.metadata as any)?.transferId;
          if (transferId) {
            try {
              await reversePlatformTransfer(transferId);
            } catch (revErr: any) {
              console.error("PAYOUT_FAILED_REVERSAL_ERROR:", revErr?.message || revErr);
              await db.guardianLog.create({
                data: {
                  level: "CRITICAL",
                  source: "payout",
                  message: `Reversal impossible après payout ${event.type} — wallet re-crédité mais fonds toujours sur le compte Connect. payoutId=${obj.id} transferId=${transferId}`,
                  metadata: { payoutId: obj.id, transferId },
                },
              });
            }
          }
        }
        break;
      }

      case "account.updated": {
        const accountId = obj.id as string;
        const user = await db.user.findFirst({ where: { stripeAccountId: accountId } });
        if (user) {
          const account = obj as Stripe.Account;
          const ext = getPrimaryExternalAccount(account);
          await db.user.update({
            where: { id: user.id },
            data: {
              // champs historiques (conservés)
              payoutsEnabled: account.payouts_enabled || false,
              stripeOnboarded: account.details_submitted || false,
              // champs Connect enrichis
              stripeChargesEnabled: account.charges_enabled || false,
              stripeDetailsSubmitted: account.details_submitted || false,
              stripeConnectStatus: mapConnectStatus(account),
              payoutsDisabledReason: account.requirements?.disabled_reason || null,
              stripeCountry: account.country || undefined,
              stripeDefaultCurrency: account.default_currency
                ? account.default_currency.toUpperCase()
                : undefined,
              ...(ext && {
                bankAccountLast4: ext.last4,
                bankAccountCountry: ext.country,
                bankAccountCurrency: ext.currency,
              }),
            },
          });
        }
        break;
      }

      case "account.external_account.created":
      case "account.external_account.updated": {
        // En Express, l'IBAN est saisi sur la page Stripe : on reflète ce compte
        // externe en local (upsert) pour que /api/payouts/create le retrouve.
        if (obj.object === "bank_account") {
          const connectedAccountId = obj.account as string;
          const owner = await db.user.findFirst({ where: { stripeAccountId: connectedAccountId } });
          if (owner) {
            const last4 = obj.last4 as string | undefined;
            await db.bankAccount.upsert({
              where: { providerBankAccountId: obj.id as string },
              create: {
                userId: owner.id,
                providerBankAccountId: obj.id as string,
                ibanMasked: last4 ? `•••• ${last4}` : "••••",
                holderName: obj.account_holder_name || owner.name || "Titulaire",
                bankName: obj.bank_name || null,
                country: obj.country || "FR",
                currency: (obj.currency || "eur").toUpperCase(),
                status: obj.status === "errored" ? "REJECTED" : "VERIFIED",
                isDefault: obj.default_for_currency ?? true,
              },
              update: {
                status: obj.status === "errored" ? "REJECTED" : "VERIFIED",
                bankName: obj.bank_name || undefined,
              },
            });
          }
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
