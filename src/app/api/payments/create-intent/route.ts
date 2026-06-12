import { NextResponse, after } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { createPaymentEvidence, calculateRiskScore } from "@/lib/services/chargeback-defender";
import { checkPlanCap, toEurApprox } from "@/lib/services/plans";
import { createNotification } from "@/lib/services/notifications";

const consentSchema = z.object({
  termsAccepted: z.boolean(),
  refundPolicyAccepted: z.boolean(),
  consentAt: z.string(),
  consentDurationMs: z.number(),
}).optional();

const schema = z.object({
  amount: z.number().int().min(100).max(99999900),
  currency: z.enum(["eur", "usd", "gbp"]).default("eur"),
  receiverId: z.string().min(1),
  payerEmail: z.string().email().optional(),
  payerName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  idempotencyKey: z.string().max(64).optional(),
  consent: consentSchema,
});

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`intent:${ip}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    const body = await req.json();
    const v = schema.parse(body);

    // Requêtes indépendantes → en parallèle (1 aller-retour DB au lieu de 2)
    const [existing, receiver] = await Promise.all([
      v.idempotencyKey
        ? db.transaction.findUnique({ where: { idempotencyKey: v.idempotencyKey } })
        : Promise.resolve(null),
      db.user.findUnique({ where: { id: v.receiverId }, include: { wallet: true } }),
    ]);

    if (existing) {
      return NextResponse.json({ transactionId: existing.id, duplicate: true, clientSecret: null });
    }
    if (!receiver?.wallet) return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });

    // Équivalent EUR (taux indicatif) pour les contrôles de limites — le
    // crédit wallet réel utilisera le taux Stripe au règlement (webhook).
    const amountEur = toEurApprox(v.amount, v.currency);

    if (receiver.dailyVolume + amountEur > 1000000) {
      return NextResponse.json({ error: "Limite journalière atteinte" }, { status: 429 });
    }

    // Plafond mensuel du plan (Starter 500€ / Pro 1500€ / Business illimité)
    const capCheck = await checkPlanCap(receiver, amountEur);
    if (!capCheck.allowed) {
      after(async () => {
        // Prévenir le vendeur qu'il perd des paiements — une seule notif non lue à la fois
        const existing = await db.notification.findFirst({
          where: { userId: receiver.id, type: "PLAN_LIMIT_WARNING", read: false },
          select: { id: true },
        });
        if (!existing) {
          await createNotification({
            userId: receiver.id,
            type: "PLAN_LIMIT_WARNING",
            title: "Plafond mensuel atteint",
            body: `Un paiement a été refusé : vous avez atteint votre plafond ${capCheck.planName} de ${(capCheck.cap / 100).toFixed(0)}€/mois. Passez au plan supérieur pour continuer à encaisser.`,
            href: "/dashboard/plan",
          });
        }
      });
      return NextResponse.json(
        { error: "Le bénéficiaire a atteint son plafond mensuel d'encaissement." },
        { status: 403 }
      );
    }

    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: v.amount,
      currency: v.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        receiverId: receiver.id,
        walletId: receiver.wallet.id,
        payerEmail: v.payerEmail || "",
        payerName: v.payerName || "",
        description: v.description || "",
        idempotencyKey: v.idempotencyKey || "",
        currency: v.currency,
      },
    }, v.idempotencyKey ? { idempotencyKey: v.idempotencyKey } : undefined);

    const fees = Math.round((v.amount * 150) / 10000);
    const tx = await db.transaction.create({
      data: {
        walletId: receiver.wallet.id,
        userId: receiver.id,
        type: "PAYIN",
        status: "PENDING",
        amount: v.amount,
        fees,
        netAmount: v.amount - fees,
        currency: v.currency.toUpperCase(),
        paymentMethod: "CARD",
        providerTransactionId: paymentIntent.id,
        provider: "stripe",
        payerEmail: v.payerEmail,
        payerName: v.payerName,
        description: v.description,
        idempotencyKey: v.idempotencyKey,
      },
    });

    // Tout ce qui suit n'est pas nécessaire pour afficher le formulaire de
    // paiement : exécuté APRÈS l'envoi de la réponse (after = waitUntil Vercel).
    // Le payeur gagne 4-6 allers-retours DB sur le chemin critique.
    const userAgent = req.headers.get("user-agent") || undefined;

    after(async () => {
      try {
        await db.auditLog.create({
          data: {
            userId: receiver.id,
            action: "PAYMENT_INTENT_CREATED",
            target: tx.id,
            metadata: { amount: v.amount, paymentIntentId: paymentIntent.id },
          },
        });

        if (v.consent?.termsAccepted && v.consent?.refundPolicyAccepted) {
          const evidence = await createPaymentEvidence({
            stripePaymentIntentId: paymentIntent.id,
            payerEmail: v.payerEmail,
            payerName: v.payerName,
            amount: v.amount,
            recipientAdminId: receiver.id,
            description: v.description,
            ipAddress: ip,
            userAgent,
            termsAccepted: v.consent.termsAccepted,
            refundPolicyAccepted: v.consent.refundPolicyAccepted,
            consentAt: new Date(v.consent.consentAt),
          });

          const risk = await calculateRiskScore({
            amount: v.amount,
            payerEmail: v.payerEmail,
            payerName: v.payerName,
            ipAddress: ip,
            userAgent,
            description: v.description,
            recipientAdminId: receiver.id,
            consentDurationMs: v.consent.consentDurationMs,
          });

          await db.paymentRisk.create({
            data: {
              paymentEvidenceId: evidence.id,
              score: risk.score,
              level: risk.level,
              reasons: risk.reasons,
            },
          });

          if (risk.level === "CRITICAL") {
            const { createAdminAlert } = await import("@/lib/services/chargeback-defender");
            await createAdminAlert({
              type: "HIGH_RISK_PAYMENT",
              severity: "CRITICAL",
              title: `Paiement à risque critique: ${(v.amount / 100).toFixed(2)}€`,
              message: `Score ${risk.score}/100. Raisons: ${risk.reasons.join(", ")}`,
              paymentEvidenceId: evidence.id,
            });
          }

          // Risque élevé → le vendeur est prévenu en temps réel (email + cloche)
          if (risk.level === "HIGH" || risk.level === "CRITICAL") {
            await createNotification({
              userId: receiver.id,
              type: "RISK_DETECTED",
              title: `Paiement à risque ${risk.level === "CRITICAL" ? "critique" : "élevé"} détecté`,
              body: `Score ${risk.score}/100 sur un paiement de ${(v.amount / 100).toFixed(2)} ${v.currency.toUpperCase()}. Les preuves sont collectées automatiquement.`,
              href: "/dashboard/transactions",
            });
            try {
              const { sendHighRiskAlertEmail } = await import("@/lib/email");
              await sendHighRiskAlertEmail(receiver.email, {
                amount: v.amount,
                currency: v.currency.toUpperCase(),
                score: risk.score,
                reasons: risk.reasons,
                payerEmail: v.payerEmail,
                date: new Date(),
              });
            } catch (riskEmailErr) {
              console.error("RISK_ALERT_EMAIL_ERROR:", riskEmailErr);
            }
          }
        }
      } catch (err) {
        console.error("CREATE_INTENT_AFTER:", err);
      }
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: tx.id,
      amount: v.amount,
    });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("CREATE_INTENT:", e);
    const msg = e?.type === "StripeInvalidRequestError" ? e.message : "Erreur paiement";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
