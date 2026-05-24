import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApplePayProvider, getPaymentProvider } from "@/lib/payments";
import { applePayPaymentSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const v = applePayPaymentSchema.parse(body);

    const receiver = await db.user.findUnique({ where: { id: v.receiverId }, include: { wallet: true } });
    if (!receiver?.wallet) return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });

    const appleProvider = getApplePayProvider();
    const paymentProvider = getPaymentProvider();

    let wId = receiver.wallet.providerWalletId;
    if (!wId) {
      const { providerWalletId } = await paymentProvider.createWallet(receiver.id);
      wId = providerWalletId;
      await db.wallet.update({ where: { id: receiver.wallet.id }, data: { providerWalletId: wId } });
    }

    const result = await appleProvider.processPayment({
      walletId: wId,
      amount: v.amount,
      paymentToken: v.paymentToken,
      metadata: { receiverId: receiver.id },
    });

    const tx = await db.transaction.create({
      data: {
        walletId: receiver.wallet.id,
        userId: receiver.id,
        type: "PAYIN",
        status: result.status === "succeeded" ? "SUCCEEDED" : "PENDING",
        amount: v.amount,
        netAmount: v.amount,
        paymentMethod: "APPLE_PAY",
        providerTransactionId: result.providerTxId,
        payerEmail: v.payerEmail,
        payerName: v.payerName,
        description: v.description || "Paiement Apple Pay",
        provider: "apple_pay",
      },
    });

    if (result.status === "succeeded") {
      await db.wallet.update({ where: { id: receiver.wallet.id }, data: { availableBalance: { increment: v.amount } } });
    } else {
      await db.wallet.update({ where: { id: receiver.wallet.id }, data: { pendingBalance: { increment: v.amount } } });
    }

    return NextResponse.json({ status: result.status, transactionId: tx.id });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("APPLE_PAY_PROCESS:", e);
    return NextResponse.json({ error: "Erreur paiement Apple Pay" }, { status: 500 });
  }
}
