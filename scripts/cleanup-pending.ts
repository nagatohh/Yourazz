import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const db = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("🔍 Recherche des transactions PENDING...");

  const pendingTxs = await db.transaction.findMany({
    where: { status: "PENDING", provider: "stripe", type: "PAYIN" },
    include: { wallet: true },
  });

  console.log(`   ${pendingTxs.length} transaction(s) PENDING trouvée(s)`);

  let cleaned = 0;
  let totalAmount = 0;

  for (const tx of pendingTxs) {
    if (!tx.providerTransactionId) continue;

    try {
      const pi = await stripe.paymentIntents.retrieve(tx.providerTransactionId);

      // Si le PaymentIntent n'est pas succeeded, on nettoie
      if (pi.status === "canceled" || pi.status === "requires_payment_method" || pi.status === "requires_action") {
        // Le client n'a jamais payé — marquer FAILED
        await db.transaction.update({
          where: { id: tx.id },
          data: { status: "FAILED", failureReason: `Abandonné (Stripe: ${pi.status})` },
        });

        // Décrémenter pendingBalance si > 0
        if (tx.wallet && tx.wallet.pendingBalance >= tx.amount) {
          await db.wallet.update({
            where: { id: tx.walletId },
            data: { pendingBalance: { decrement: tx.amount } },
          });
        }

        cleaned++;
        totalAmount += tx.amount;
        console.log(`   ✓ ${tx.id} — ${tx.amount / 100}€ — ${pi.status} → FAILED`);
      } else if (pi.status === "succeeded") {
        // Le paiement a réussi mais le webhook n'a pas été traité — confirmer
        console.log(`   ⚡ ${tx.id} — ${tx.amount / 100}€ — succeeded mais non confirmé → correction`);

        await db.transaction.update({
          where: { id: tx.id },
          data: { status: "SUCCEEDED" },
        });

        // Décrémenter pending et incrémenter available
        const updates: any = { availableBalance: { increment: tx.netAmount } };
        if (tx.wallet && tx.wallet.pendingBalance >= tx.amount) {
          updates.pendingBalance = { decrement: tx.amount };
        }
        await db.wallet.update({ where: { id: tx.walletId }, data: updates });

        console.log(`   ✓ Confirmé et crédité ${tx.netAmount / 100}€`);
      } else {
        console.log(`   ⏳ ${tx.id} — ${tx.amount / 100}€ — ${pi.status} (en cours, on laisse)`);
      }
    } catch (e: any) {
      if (e?.statusCode === 404) {
        // PaymentIntent n'existe plus dans Stripe
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
        cleaned++;
        totalAmount += tx.amount;
        console.log(`   ✓ ${tx.id} — ${tx.amount / 100}€ — introuvable → FAILED`);
      } else {
        console.error(`   ✗ ${tx.id} — erreur: ${e.message}`);
      }
    }
  }

  console.log(`\n✅ Nettoyage terminé: ${cleaned} transaction(s) expirée(s), ${totalAmount / 100}€ libérés du pendingBalance`);

  // Afficher l'état final du wallet
  const wallets = await db.wallet.findMany();
  for (const w of wallets) {
    if (w.pendingBalance > 0) {
      console.log(`   Wallet ${w.id}: pending=${w.pendingBalance / 100}€, available=${w.availableBalance / 100}€`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
