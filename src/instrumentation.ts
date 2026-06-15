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
      // Noms uniquement (jamais les valeurs) + ligne compacte pour éviter la
      // troncature des logs Vercel. Non bloquant.
      const names = errors.map((e) => e.split(":")[0].trim()).join(", ");
      console.error(`[env] non-conforme: ${names}`);
      for (const e of errors) console.error(`[env] detail ${e}`);
    } else {
      console.log("[env] Variables d'environnement validées.");
    }
  } catch (e) {
    // Ne jamais laisser l'instrumentation faire tomber le runtime.
    console.error("[env] Validation impossible :", (e as Error)?.message || e);
  }
}
