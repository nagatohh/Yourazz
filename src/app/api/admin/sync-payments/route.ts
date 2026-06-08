import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const stripe = getStripe();

  const pendingTxs = await db.transaction.findMany({
    where: { status: "PENDING", provider: "stripe", type: "PAYIN" },
    include: { wallet: true },
  });

  const results: { id: string; amount: number; action: string }[] = [];

  for (const tx of pendingTxs) {
    if (!tx.providerTransactionId) continue;

    try {
      const pi = await stripe.paymentIntents.retrieve(tx.providerTransactionId);

      if (pi.status === "canceled" || pi.status === "requires_payment_method" || pi.status === "requires_action") {
        await db.transaction.update({
          where: { id: tx.id },
          data: { status: "FAILED", failureReason: `Abandonné (Stripe: ${pi.status})` },
        });
        if (tx.wallet && tx.wallet.pendingBalance >= tx.amount) {
          await db.wallet.update({
            where: { id: tx.walletId },
            data: { pendingBalance: { decrement: tx.amount } },
          });
        }
        results.push({ id: tx.id, amount: tx.amount, action: "failed" });
      } else if (pi.status === "succeeded") {
        await db.transaction.update({
          where: { id: tx.id },
          data: { status: "SUCCEEDED" },
        });
        const updates: any = { availableBalance: { increment: tx.netAmount } };
        if (tx.wallet && tx.wallet.pendingBalance >= tx.amount) {
          updates.pendingBalance = { decrement: tx.amount };
        }
        await db.wallet.update({ where: { id: tx.walletId }, data: updates });
        results.push({ id: tx.id, amount: tx.amount, action: "confirmed" });
      } else {
        results.push({ id: tx.id, amount: tx.amount, action: `skipped (${pi.status})` });
      }
    } catch (e: any) {
      if (e?.statusCode === 404) {
        await db.transaction.update({
          where: { id: tx.id },
          data: { status: "FAILED", failureReason: "PaymentIntent introuvable dans Stripe" },
        });
        if (tx.wallet && tx.wallet.pendingBalance >= tx.amount) {
          await db.wallet.update({
            where: { id: tx.walletId },
            data: { pendingBalance: { decrement: tx.amount } },
          });
        }
        results.push({ id: tx.id, amount: tx.amount, action: "not_found" });
      } else {
        results.push({ id: tx.id, amount: tx.amount, action: `error: ${e.message}` });
      }
    }
  }

  const wallet = await db.wallet.findFirst({
    where: { userId: admin.userId },
    select: { availableBalance: true, pendingBalance: true },
  });

  return NextResponse.json({
    synced: results.length,
    results,
    wallet,
  });
}
