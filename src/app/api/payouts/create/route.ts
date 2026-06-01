import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createConnectedPayout, getConnectedBalance, getAccountStatus } from "@/lib/services/stripe-connect";
import { randomUUID } from "crypto";

const createPayoutSchema = z.object({
  amount: z.number().int().min(500, "Minimum 5,00 EUR"),
  bankAccountId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const v = createPayoutSchema.parse(await req.json());

    const user = await db.user.findUnique({ where: { id: s.userId } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (!user.stripeAccountId) {
      return NextResponse.json({ error: "Compte Stripe non configuré" }, { status: 400 });
    }

    const accountStatus = await getAccountStatus(user.stripeAccountId);
    if (!accountStatus.payoutsEnabled) {
      return NextResponse.json({ error: "Les retraits ne sont pas encore activés sur votre compte. Complétez la vérification." }, { status: 400 });
    }

    const bank = await db.bankAccount.findFirst({
      where: { id: v.bankAccountId, userId: user.id, status: "VERIFIED" },
    });
    if (!bank) {
      return NextResponse.json({ error: "Compte bancaire introuvable ou non vérifié" }, { status: 400 });
    }
    if (!bank.providerBankAccountId) {
      return NextResponse.json({ error: "Compte bancaire non lié à Stripe" }, { status: 400 });
    }

    const balance = await getConnectedBalance(user.stripeAccountId);
    if (balance.available < v.amount) {
      return NextResponse.json({ error: `Solde insuffisant. Disponible : ${(balance.available / 100).toFixed(2)} EUR` }, { status: 400 });
    }

    const idempotencyKey = `payout_${user.id}_${Date.now()}_${randomUUID().slice(0, 8)}`;

    const existing = await db.payout.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return NextResponse.json({ payout: existing });
    }

    const stripeResult = await createConnectedPayout({
      stripeAccountId: user.stripeAccountId,
      amount: v.amount,
      currency: bank.currency.toLowerCase(),
      externalAccountId: bank.providerBankAccountId,
      idempotencyKey,
      description: "Retrait YouRazz",
    });

    const payout = await db.payout.create({
      data: {
        userId: user.id,
        bankAccountId: bank.id,
        amount: v.amount,
        fees: 0,
        netAmount: v.amount,
        currency: bank.currency,
        status: "PROCESSING",
        providerPayoutId: stripeResult.payoutId,
        idempotencyKey,
        estimatedArrival: stripeResult.arrivalDate ? new Date(stripeResult.arrivalDate * 1000) : null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PAYOUT_CREATED",
        target: payout.id,
        metadata: {
          amount: v.amount,
          bankAccountId: bank.id,
          stripePayoutId: stripeResult.payoutId,
        },
      },
    });

    return NextResponse.json({ payout });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (e?.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: e.message || "Erreur Stripe" }, { status: 400 });
    }
    console.error("PAYOUT_CREATE:", e?.message || e);
    return NextResponse.json({ error: "Erreur lors du retrait" }, { status: 500 });
  }
}
