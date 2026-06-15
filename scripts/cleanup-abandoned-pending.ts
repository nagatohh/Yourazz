/**
 * Nettoyage ponctuel des PAYIN bloqués en PENDING alors qu'ils ont été
 * ABANDONNÉS (jamais payés). Chaque PaymentIntent ci-dessous a été vérifié
 * un par un via l'API Stripe (live) : statut requires_payment_method, ou
 * inexistant côté live (anciens PI de test). AUCUN n'est succeeded.
 *
 * - Marque ces transactions FAILED (uniquement si encore PENDING — idempotent).
 * - Ne touche JAMAIS availableBalance.
 * - Remet à 0 le pendingBalance fantôme du compte owner, et seulement si plus
 *   aucune transaction in-flight ne subsiste pour lui.
 *
 *   DATABASE_URL=<DIRECT_URL> npx tsx scripts/cleanup-abandoned-pending.ts
 */
import { db } from "@/lib/db";

// 27 PI vérifiés abandonnés via l'API Stripe (statut/inexistence confirmés).
const ABANDONED_PIS = [
  // clients
  "pi_3Tigr9AhbrFP9Moj0wVgsiZM", "pi_3Tig1eAhbrFP9Moj1A79XQGt", "pi_3Tig11AhbrFP9Moj1Jj9XvlK",
  "pi_3TifyhAhbrFP9Moj1cGwVnPH", "pi_3TifaIAhbrFP9Moj1XX19nAs",
  // compte owner (tests)
  "pi_3TiBVzAhbrFP9Moj1mau9t5h", "pi_3ThE3lPNsBg1CSSv1cR6NelE", "pi_3ThE3lPNsBg1CSSv16jhOZiY",
  "pi_3ThE3IPNsBg1CSSv0QGDotur", "pi_3ThE3IPNsBg1CSSv1hCw9VRS", "pi_3Th9W2AhbrFP9Moj00ASgDvb",
  "pi_3Th9T9AhbrFP9Moj1UzBKDt6", "pi_3TgoNiAhbrFP9Moj1SiSr6zO", "pi_3TgoLeAhbrFP9Moj1O8exH2s",
  "pi_3TgWzCAhbrFP9Moj1Ts2TxZ2", "pi_3TgWwrAhbrFP9Moj1hS6CCoX", "pi_3TgWe2AhbrFP9Moj0B9vkODW",
  "pi_3TgVhQAhbrFP9Moj0su3aapm", "pi_3TgTeYAhbrFP9Moj0V0Oi5D8", "pi_3TgTYBAhbrFP9Moj1UzS1Rp2",
  "pi_3TgRmXAhbrFP9Moj1ud5QZZP", "pi_3TgQO1AhbrFP9Moj0k3EAYhu", "pi_3TgPADAhbrFP9Moj1r6C0Ia1",
  "pi_3TgOwHAhbrFP9Moj0EiKGroD", "pi_3TgN3CAhbrFP9Moj1jpRvv1G", "pi_3TgIONAhbrFP9Moj1Fkfwk9h",
  "pi_3TgHs8AhbrFP9Moj0hIHwakB",
];

const RESET_PENDING_USER = "admin_owner_001";

async function main() {
  let failed = 0;
  for (const pi of ABANDONED_PIS) {
    const tx = await db.transaction.findUnique({ where: { providerTransactionId: pi } });
    if (!tx) {
      console.log(`- ${pi} : introuvable`);
      continue;
    }
    if (tx.status !== "PENDING") {
      console.log(`- ${pi} : déjà ${tx.status} — ignoré`);
      continue;
    }
    await db.transaction.update({
      where: { id: tx.id },
      data: { status: "FAILED", failureReason: "Abandonné — paiement non finalisé (vérifié via Stripe)" },
    });
    failed++;
    console.log(`✓ ${pi} (${(tx.amount / 100).toFixed(2)}€) → FAILED`);
  }

  // Assainir le pendingBalance fantôme du compte owner.
  const remaining = await db.transaction.aggregate({
    where: { userId: RESET_PENDING_USER, type: "PAYIN", status: { in: ["PENDING", "PROCESSING", "AUTHORIZED"] } },
    _sum: { amount: true },
  });
  const inflight = remaining._sum.amount ?? 0;
  const wallet = await db.wallet.findFirst({ where: { userId: RESET_PENDING_USER } });
  if (wallet) {
    console.log(
      `\nowner: in-flight restant=${(inflight / 100).toFixed(2)}€ | pendingBalance=${(wallet.pendingBalance / 100).toFixed(2)}€ | available=${(wallet.availableBalance / 100).toFixed(2)}€`,
    );
    if (inflight === 0 && wallet.pendingBalance !== 0) {
      await db.wallet.update({ where: { id: wallet.id }, data: { pendingBalance: 0 } });
      console.log("  → pendingBalance fantôme remis à 0 (available inchangé)");
    }
  }

  console.log(`\n✅ ${failed} paiement(s) abandonné(s) marqué(s) FAILED.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("CLEANUP_ERROR:", e);
    process.exit(1);
  });
