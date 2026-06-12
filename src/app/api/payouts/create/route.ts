import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireActiveAccess } from "@/lib/auth/access";
import {
  createConnectedPayout,
  createPlatformTransfer,
  reversePlatformTransfer,
  getAccountStatus,
} from "@/lib/services/stripe-connect";

const createPayoutSchema = z.object({
  amount: z.number().int().min(500, "Minimum 5,00 EUR"),
  bankAccountId: z.string().min(1),
});

/**
 * Retrait : wallet interne (source de vérité) → transfer plateforme vers le
 * compte Connect du user → payout vers SON IBAN, exécuté sur SON compte.
 *
 * Invariant d'isolation : toutes les opérations Stripe sont rattachées à
 * user.stripeAccountId du user en session. Aucun payout plateforme possible.
 */
export async function POST(req: Request) {
  try {
    const access = await requireActiveAccess();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const v = createPayoutSchema.parse(await req.json());

    const user = await db.user.findUnique({ where: { id: access.userId }, include: { wallet: true } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (!user.stripeAccountId) {
      return NextResponse.json({ error: "Compte Stripe non configuré" }, { status: 400 });
    }
    if (!user.wallet) {
      return NextResponse.json({ error: "Wallet introuvable" }, { status: 400 });
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

    // Le wallet interne fait foi : c'est le ledger qui sait ce que CE user
    // peut retirer (le solde plateforme Stripe est mutualisé entre tous).
    if (user.wallet.availableBalance < v.amount) {
      return NextResponse.json({
        error: `Solde insuffisant. Disponible : ${(user.wallet.availableBalance / 100).toFixed(2)} EUR`,
      }, { status: 400 });
    }

    // Clé déterministe sur une fenêtre de 30s : un double-clic ou un retry
    // réseau retombe sur le même payout au lieu d'en créer deux.
    const idempotencyKey = `payout_${user.id}_${bank.id}_${v.amount}_${Math.floor(Date.now() / 30000)}`;

    const existing = await db.payout.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return NextResponse.json({ payout: existing });
    }

    // 1. Débit atomique du wallet — réserve les fonds avant tout appel Stripe.
    //    La condition gte rejette les requêtes concurrentes sur le même solde.
    const debited = await db.wallet.updateMany({
      where: { id: user.wallet.id, availableBalance: { gte: v.amount } },
      data: { availableBalance: { decrement: v.amount } },
    });
    if (debited.count === 0) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const refundWallet = () =>
      db.wallet.update({
        where: { id: user.wallet!.id },
        data: { availableBalance: { increment: v.amount } },
      });

    // 2. Transfer plateforme → compte Connect du user
    let transferId: string;
    try {
      const transfer = await createPlatformTransfer({
        stripeAccountId: user.stripeAccountId,
        amount: v.amount,
        currency: bank.currency,
        idempotencyKey: `tr_${idempotencyKey}`,
        userId: user.id,
      });
      transferId = transfer.transferId;
    } catch (e: any) {
      await refundWallet();
      console.error("PAYOUT_TRANSFER_ERROR:", e?.message || e);
      const msg = e?.code === "balance_insufficient"
        ? "Vos fonds sont encore en cours de règlement par Stripe. Réessayez d'ici 24 à 48h."
        : "Le transfert des fonds a échoué. Votre solde n'a pas été débité.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // 3. Payout depuis le compte Connect du user vers son IBAN
    let stripeResult: { payoutId: string; status: string; arrivalDate?: number };
    try {
      stripeResult = await createConnectedPayout({
        stripeAccountId: user.stripeAccountId,
        amount: v.amount,
        currency: bank.currency.toLowerCase(),
        externalAccountId: bank.providerBankAccountId,
        idempotencyKey,
        description: "Retrait Yourazz",
      });
    } catch (e: any) {
      // Rollback symétrique : on ramène l'argent sur la plateforme puis on
      // re-crédite le wallet. Si le reversal échoue, les fonds sont sur le
      // compte Connect du user (ils lui appartiennent) — alerte critique
      // pour réparation manuelle, wallet laissé débité pour rester cohérent.
      try {
        await reversePlatformTransfer(transferId);
        await refundWallet();
      } catch (revErr: any) {
        console.error("PAYOUT_REVERSAL_ERROR:", revErr?.message || revErr);
        await db.guardianLog.create({
          data: {
            level: "CRITICAL",
            source: "payout",
            message: `Reversal impossible après échec payout — fonds sur le compte Connect, wallet débité. userId=${user.id} transferId=${transferId} amount=${v.amount}`,
            metadata: { userId: user.id, transferId, amount: v.amount },
          },
        });
      }
      console.error("PAYOUT_CREATE_STRIPE_ERROR:", e?.message || e);
      return NextResponse.json({ error: e?.message || "Le retrait a échoué. Votre solde n'a pas été débité." }, { status: 502 });
    }

    // 4. Enregistrements ledger : payout + transaction PAYOUT
    const payout = await db.$transaction(async (prisma) => {
      const p = await prisma.payout.create({
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

      await prisma.transaction.create({
        data: {
          walletId: user.wallet!.id,
          userId: user.id,
          type: "PAYOUT",
          status: "PROCESSING",
          amount: v.amount,
          fees: 0,
          netAmount: v.amount,
          providerTransactionId: stripeResult.payoutId,
          provider: "stripe",
          description: "Retrait vers compte bancaire",
          metadata: { transferId },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PAYOUT_CREATED",
          target: p.id,
          metadata: {
            amount: v.amount,
            bankAccountId: bank.id,
            stripePayoutId: stripeResult.payoutId,
            transferId,
          },
        },
      });

      return p;
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
