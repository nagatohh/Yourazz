import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  amount: z.number().int().min(100).max(99999900),
  receiverId: z.string().min(1),
  payerEmail: z.string().email().optional(),
  payerName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  idempotencyKey: z.string().max(64).optional(),
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

    if (v.idempotencyKey) {
      const existing = await db.transaction.findUnique({ where: { idempotencyKey: v.idempotencyKey } });
      if (existing) {
        return NextResponse.json({ transactionId: existing.id, duplicate: true, clientSecret: null });
      }
    }

    const receiver = await db.user.findUnique({ where: { id: v.receiverId }, include: { wallet: true } });
    if (!receiver?.wallet) return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });

    if (receiver.dailyVolume + v.amount > 1000000) {
      return NextResponse.json({ error: "Limite journalière atteinte" }, { status: 429 });
    }

    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: v.amount,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        receiverId: receiver.id,
        walletId: receiver.wallet.id,
        payerEmail: v.payerEmail || "",
        payerName: v.payerName || "",
        description: v.description || "",
        idempotencyKey: v.idempotencyKey || "",
      },
    }, v.idempotencyKey ? { idempotencyKey: v.idempotencyKey } : undefined);

    const tx = await db.transaction.create({
      data: {
        walletId: receiver.wallet.id,
        userId: receiver.id,
        type: "PAYIN",
        status: "PENDING",
        amount: v.amount,
        fees: Math.round((v.amount * 150) / 10000),
        netAmount: v.amount - Math.round((v.amount * 150) / 10000),
        paymentMethod: "CARD",
        providerTransactionId: paymentIntent.id,
        provider: "stripe",
        payerEmail: v.payerEmail,
        payerName: v.payerName,
        description: v.description,
        idempotencyKey: v.idempotencyKey,
      },
    });

    await db.wallet.update({
      where: { id: receiver.wallet.id },
      data: { pendingBalance: { increment: v.amount } },
    });

    await db.auditLog.create({
      data: {
        userId: receiver.id,
        action: "PAYMENT_INTENT_CREATED",
        target: tx.id,
        metadata: { amount: v.amount, paymentIntentId: paymentIntent.id },
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: tx.id,
      amount: v.amount,
    });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("CREATE_INTENT:", e);
    return NextResponse.json({ error: "Erreur paiement" }, { status: 500 });
  }
}
