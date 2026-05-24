import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { createPaymentSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { createPayin } from "@/lib/services/ledger";
import type { PaymentMethod } from "@prisma/client";

const METHOD_MAP: Record<string, PaymentMethod> = {
  card: "CARD",
  apple_pay: "APPLE_PAY",
  google_pay: "GOOGLE_PAY",
  bank_transfer: "BANK_TRANSFER",
  open_banking: "OPEN_BANKING",
};

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`payment:${ip}`, 20, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes, réessayez dans 1 minute" }, { status: 429 });

    const body = await req.json();
    const v = createPaymentSchema.parse(body);

    if (v.idempotencyKey) {
      const existing = await db.transaction.findUnique({ where: { idempotencyKey: v.idempotencyKey } });
      if (existing) return NextResponse.json({ status: existing.status.toLowerCase(), transactionId: existing.id, duplicate: true });
    }

    const receiver = await db.user.findUnique({ where: { id: v.receiverId }, include: { wallet: true } });
    if (!receiver?.wallet) return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });

    if (receiver.dailyVolume + v.amount > 1000000) {
      return NextResponse.json({ error: "Limite journalière atteinte" }, { status: 429 });
    }
    if (receiver.monthlyVolume + v.amount > 5000000) {
      return NextResponse.json({ error: "Limite mensuelle atteinte" }, { status: 429 });
    }

    const provider = getPaymentProvider();

    let wId = receiver.wallet.providerWalletId;
    if (!wId) {
      const { providerWalletId } = await provider.createWallet(receiver.id);
      wId = providerWalletId;
      await db.wallet.update({ where: { id: receiver.wallet.id }, data: { providerWalletId: wId } });
    }

    const result = await provider.createPayin({
      walletId: wId,
      amount: v.amount,
      method: v.paymentMethod,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
      metadata: { receiverId: receiver.id },
      idempotencyKey: v.idempotencyKey,
    });

    const status = result.status === "succeeded" ? "SUCCEEDED" : result.status === "authorized" ? "AUTHORIZED" : "PENDING";

    const tx = await createPayin({
      walletId: receiver.wallet.id,
      userId: receiver.id,
      amount: v.amount,
      paymentMethod: METHOD_MAP[v.paymentMethod] || "CARD",
      providerTxId: result.providerTxId,
      provider: provider.name,
      status,
      payerEmail: v.payerEmail,
      payerName: v.payerName,
      description: v.description,
      idempotencyKey: v.idempotencyKey,
    });

    return NextResponse.json({ status: result.status, redirectUrl: result.redirectUrl, transactionId: tx.id });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("PAYMENT_CREATE:", e);
    return NextResponse.json({ error: "Erreur paiement" }, { status: 500 });
  }
}
