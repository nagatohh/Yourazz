import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { requestPayoutSchema } from "@/lib/validators";
import { createPayout } from "@/lib/services/ledger";

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const v = requestPayoutSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { id: s.userId }, include: { wallet: true } });

    if (!user?.wallet) return NextResponse.json({ error: "Wallet introuvable" }, { status: 400 });
    if (user.wallet.availableBalance < v.amount) return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });

    const bank = await db.bankAccount.findFirst({ where: { id: v.bankAccountId, userId: user.id } });
    if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });

    const provider = getPaymentProvider();
    const result = await provider.createPayout({
      walletId: user.wallet.providerWalletId || "",
      bankAccountId: bank.providerBankAccountId || "",
      amount: v.amount,
    });

    const payout = await createPayout({
      userId: user.id,
      walletId: user.wallet.id,
      bankAccountId: bank.id,
      amount: v.amount,
      providerPayoutId: result.providerPayoutId,
      provider: provider.name,
    });

    return NextResponse.json({ payout });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    if (e?.message === "INSUFFICIENT_BALANCE") return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Erreur retrait" }, { status: 500 });
  }
}
