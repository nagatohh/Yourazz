/**
 * Hook d'instrumentation Next.js — exécuté une fois au démarrage du serveur.
 *
 * On y valide les variables d'environnement et on JOURNALISE tout problème de
 * façon visible. On ne lève JAMAIS d'exception ici : sur une plateforme de
 * paiement en production, une instrumentation qui throw casse tout le runtime
 * (toutes les routes dynamiques tombent en 500). Le diagnostic part dans les
 * logs ; la décision d'agir reste humaine.
 */
export async function register() {
  // Seul le runtime Node a accès à tout process.env ; on saute l'edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { validateEnv } = await import("@/lib/env");
    const { success, errors } = validateEnv();

    if (!success) {
      const detail = errors.map((e) => `  - ${e}`).join("\n");
      console.error(
        `[env] ⚠️ Variables d'environnement invalides ou manquantes (non bloquant) :\n${detail}`,
      );
    } else {
      console.log("[env] Variables d'environnement validées.");
    }
  } catch (e) {
    // Ne jamais laisser l'instrumentation faire tomber le runtime.
    console.error("[env] Validation impossible :", (e as Error)?.message || e);
  }
}
