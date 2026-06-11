import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Appelée via navigator.sendBeacon quand le payeur ferme la page de paiement
 * sans avoir payé. Annule le PaymentIntent Stripe et marque la transaction
 * CANCELLED pour qu'elle ne reste pas comptée "en attente".
 *
 * Sécurité : l'ID de transaction est un cuid non devinable, et on n'annule
 * que si Stripe confirme que le paiement n'a PAS été soumis (jamais un
 * paiement en cours de traitement ou réussi).
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`abandon:${ip}`, 20, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    // sendBeacon envoie le corps en text/plain — on parse manuellement
    const raw = await req.text();
    let transactionId: string | undefined;
    try {
      transactionId = JSON.parse(raw)?.transactionId;
    } catch {
      /* corps invalide */
    }
    if (!transactionId || typeof transactionId !== "string" || transactionId.length > 64) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    // Seules les transactions Stripe PAYIN encore PENDING sont annulables
    if (!tx || tx.type !== "PAYIN" || tx.status !== "PENDING" || tx.provider !== "stripe" || !tx.providerTransactionId) {
      return NextResponse.json({ ok: true });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const pi = await stripe.paymentIntents.retrieve(tx.providerTransactionId);

    // On n'annule que si le client n'a jamais soumis le paiement.
    // processing / succeeded / requires_capture → on ne touche à rien,
    // le webhook fera foi.
    const cancellable = ["requires_payment_method", "requires_confirmation", "requires_action"];
    if (!cancellable.includes(pi.status)) {
      return NextResponse.json({ ok: true, skipped: pi.status });
    }

    try {
      await stripe.paymentIntents.cancel(pi.id, { cancellation_reason: "abandoned" });
    } catch {
      // Déjà annulé ou course avec le webhook — sans gravité
    }

    await db.$transaction(async (t) => {
      const fresh = await t.transaction.findUnique({ where: { id: tx.id } });
      if (!fresh || fresh.status !== "PENDING") return;

      await t.transaction.update({
        where: { id: tx.id },
        data: { status: "CANCELLED", failureReason: "Page de paiement fermée par le payeur" },
      });

      // Libère le pendingBalance si cet intent l'avait incrémenté
      const wallet = await t.wallet.findUnique({ where: { id: tx.walletId } });
      if (wallet && wallet.pendingBalance >= tx.amount) {
        await t.wallet.update({
          where: { id: tx.walletId },
          data: { pendingBalance: { decrement: tx.amount } },
        });
      }

      await t.auditLog.create({
        data: {
          userId: tx.userId,
          action: "PAYIN_ABANDONED",
          target: tx.id,
          metadata: { amount: tx.amount, paymentIntentId: pi.id },
        },
      });
    });

    return NextResponse.json({ ok: true, cancelled: true });
  } catch (e) {
    console.error("ABANDON:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
