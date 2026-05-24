import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOpenBankingProvider, getPaymentProvider } from "@/lib/payments";

async function processCallback(sessionId: string) {
  const obProvider = getOpenBankingProvider();
  const statusResult = await obProvider.getPaymentStatus(sessionId);

  const session = await db.openBankingSession.findFirst({
    where: { providerSessionId: sessionId },
  });

  if (!session) return { success: false, error: "Session introuvable" };

  if (statusResult.status === "succeeded" || statusResult.status === "authorized") {
    await db.openBankingSession.update({
      where: { id: session.id },
      data: { status: "SUCCEEDED" },
    });

    const user = await db.user.findUnique({ where: { id: session.userId! }, include: { wallet: true } });
    if (user?.wallet) {
      const paymentProvider = getPaymentProvider();
      let wId = user.wallet.providerWalletId;
      if (!wId) {
        const { providerWalletId } = await paymentProvider.createWallet(user.id);
        wId = providerWalletId;
        await db.wallet.update({ where: { id: user.wallet.id }, data: { providerWalletId: wId } });
      }

      await db.transaction.create({
        data: {
          walletId: user.wallet.id,
          userId: user.id,
          type: "PAYIN",
          status: "SUCCEEDED",
          amount: session.amount,
          netAmount: session.amount,
          paymentMethod: "OPEN_BANKING",
          providerTransactionId: statusResult.providerTransactionId,
          payerEmail: session.payerEmail,
          payerName: session.payerName,
          description: "Paiement Open Banking",
          provider: obProvider.name,
        },
      });

      await db.wallet.update({
        where: { id: user.wallet.id },
        data: { availableBalance: { increment: session.amount } },
      });

      await db.user.update({
        where: { id: user.id },
        data: { dailyVolume: { increment: session.amount }, monthlyVolume: { increment: session.amount } },
      });
    }

    return { success: true };
  }

  if (statusResult.status === "failed" || statusResult.status === "cancelled") {
    await db.openBankingSession.update({
      where: { id: session.id },
      data: { status: statusResult.status === "failed" ? "FAILED" : "CANCELLED", errorMessage: statusResult.errorMessage },
    });
    return { success: false, error: "Paiement refusé" };
  }

  await db.openBankingSession.update({
    where: { id: session.id },
    data: { status: "AUTHORIZED" },
  });
  return { success: true };
}

// GET: called by redirect from bank (real provider) or browser navigation
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session") || "";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!sessionId) {
      return NextResponse.redirect(new URL("/payment/failed", baseUrl));
    }

    const result = await processCallback(sessionId);

    if (result.success) {
      return NextResponse.redirect(new URL("/payment/success", baseUrl));
    }
    return NextResponse.redirect(new URL("/payment/failed", baseUrl));
  } catch (e) {
    console.error("OB_CALLBACK_GET:", e);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/payment/failed", baseUrl));
  }
}

// POST: called by the bank-auth simulation page via fetch
export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session manquante" }, { status: 400 });
    }

    const result = await processCallback(sessionId);

    if (result.success) {
      return NextResponse.json({ status: "succeeded" });
    }
    return NextResponse.json({ status: "failed", error: result.error }, { status: 400 });
  } catch (e) {
    console.error("OB_CALLBACK_POST:", e);
    return NextResponse.json({ error: "Erreur callback" }, { status: 500 });
  }
}
