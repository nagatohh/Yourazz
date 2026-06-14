import { db } from "@/lib/db";

/**
 * Détection d'activité suspecte → alertes admin (modèle AdminAlert, visibles
 * dans le tableau de bord). Toutes les fonctions sont best-effort : une alerte
 * perdue ne doit jamais faire échouer la requête appelante.
 */

const ACTIVATION_WINDOW_MS = 10 * 60 * 1000;
const ACTIVATION_THRESHOLD = 5;

async function createAlert(type: string, severity: string, title: string, message: string): Promise<void> {
  try {
    await db.adminAlert.create({ data: { type, severity, title, message } });
  } catch (e) {
    console.error("SECURITY_ALERT_ERROR:", e);
  }
}

/** Brute-force de clés d'activation : trop d'échecs récents pour un compte. */
export async function checkActivationAbuse(userId: string, ip: string | null): Promise<void> {
  try {
    const since = new Date(Date.now() - ACTIVATION_WINDOW_MS);
    const failures = await db.securityLog.count({
      where: { userId, action: "ACTIVATION_KEY_FAILED", createdAt: { gte: since } },
    });
    // Alerte au franchissement du seuil puis à chaque multiple (évite le spam).
    if (failures >= ACTIVATION_THRESHOLD && failures % ACTIVATION_THRESHOLD === 0) {
      await createAlert(
        "ACTIVATION_BRUTE_FORCE",
        "CRITICAL",
        "Tentatives d'activation suspectes",
        `${failures} échecs de clé d'activation en 10 min — compte ${userId}, IP ${ip ?? "inconnue"}.`,
      );
    }
  } catch (e) {
    console.error("ACTIVATION_ABUSE_CHECK_ERROR:", e);
  }
}

/** Verrouillage d'un compte après trop d'échecs de connexion (transition). */
export async function alertAccountLocked(email: string, ip: string): Promise<void> {
  await createAlert(
    "LOGIN_LOCKOUT",
    "WARNING",
    "Compte verrouillé (échecs de connexion)",
    `Le compte ${email} a été verrouillé 15 min après 5 échecs de connexion — IP ${ip}.`,
  );
}
