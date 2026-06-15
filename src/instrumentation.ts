/**
 * Hook d'instrumentation Next.js — exécuté une fois au démarrage du serveur.
 *
 * On y valide les variables d'environnement : en production, un secret manquant
 * ou mal formé fait échouer le boot (fail-fast) plutôt que de laisser tourner
 * une instance dégradée (auth/chiffrement/paiements cassés silencieusement).
 */
export async function register() {
  // Seul le runtime Node a accès à tout process.env ; on saute l'edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnv } = await import("@/lib/env");
  const { success, errors } = validateEnv();

  if (!success) {
    const detail = errors.map((e) => `  - ${e}`).join("\n");
    console.error(`[env] Validation des variables d'environnement échouée :\n${detail}`);
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Variables d'environnement invalides ou manquantes — démarrage interrompu (voir logs ci-dessus).",
      );
    }
  } else {
    console.log("[env] Variables d'environnement validées.");
  }
}
