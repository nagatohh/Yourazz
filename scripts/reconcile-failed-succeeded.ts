/**
 * Réconciliation ponctuelle : PaymentIntents réellement SUCCEEDED chez Stripe
 * mais bloqués en FAILED chez nous (1ʳᵉ tentative refusée → payment_failed,
 * puis retry réussi → succeeded ignoré car confirmPayin refusait FAILED).
 *
 * N'agit QUE sur les PI explicitement vérifiés à la main via l'API Stripe.
 * Idempotent : confirmPayin saute toute transaction déjà SUCCEEDED.
 *
 *   npx tsx scripts/reconcile-failed-succeeded.ts
 */
import { db } from "@/lib/db";
import { confirmPayin } from "@/lib/services/ledger";
import { createNotification } from "@/lib/services/notifications";

// PI vérifiés succeeded via l'API Stripe (statut + montant) avant exécution.
const VERIFIED_PIS = [
  "pi_3TighzAhbrFP9Moj1hyC1fEx", // karaoui.jad1@gmail.com — 3,50 €
  "pi_3TgAhEAhbrFP9Moj1A8gvH6I", // santooeuu@gmail.com — 20,00 €
];

async function main() {
  for (const pi of VERIFIED_PIS) {
    const tx = await db.transaction.findUnique({ where: { providerTransactionId: pi } });
    if (!tx) {
      console.log(`\n${pi} : transaction introuvable — ignoré`);
      continue;
    }
    const walletBefore = await db.wallet.findUnique({ where: { id: tx.walletId } });
    const user = await db.user.findUnique({ where: { id: tx.userId }, select: { email: true } });
    console.log(
      `\n${pi} | ${user?.email} | statut AVANT=${tx.status} | dispo AVANT=${((walletBefore?.availableBalance ?? 0) / 100).toFixed(2)}€`,
    );

    const wasFailed = tx.status === "FAILED";
    const res = await confirmPayin({ providerTxId: pi, provider: "stripe-reconcile" });

    const walletAfter = await db.wallet.findUnique({ where: { id: tx.walletId } });
    const delta = (walletAfter?.availableBalance ?? 0) - (walletBefore?.availableBalance ?? 0);
    console.log(
      `  → statut APRÈS=${res?.status} | dispo APRÈS=${((walletAfter?.availableBalance ?? 0) / 100).toFixed(2)}€ (crédité +${(delta / 100).toFixed(2)}€)`,
    );

    if (wasFailed && res?.status === "SUCCEEDED") {
      await createNotification({
        userId: tx.userId,
        type: "PAYMENT_RECEIVED",
        title: `Paiement de ${(tx.netAmount / 100).toFixed(2)} € crédité`,
        body: "Un paiement validé n'avait pas été crédité à cause d'un incident technique. Il est désormais sur votre solde disponible.",
        href: "/dashboard/transactions",
      });
      console.log("  notification client envoyée");
    }
  }
  console.log("\n✅ Réconciliation terminée.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("RECONCILE_ERROR:", e);
    process.exit(1);
  });
