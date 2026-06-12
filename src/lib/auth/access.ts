import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type AccessCheck =
  | { ok: true; userId: string; role: string }
  | { ok: false; error: string; status: 401 | 402 | 403 };

/**
 * Garde d'accès des routes financières : session valide + compte non
 * suspendu. Depuis le passage au modèle Starter/Pro/Business, l'abonnement
 * n'est plus requis (le plan STARTER est gratuit) : la limite se fait par
 * plafond mensuel d'encaissement (lib/services/plans.ts). Un utilisateur
 * doit toujours pouvoir retirer son argent, quel que soit son plan.
 */
export async function requireActiveAccess(): Promise<AccessCheck> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Non autorisé", status: 401 };

  const user = await db.user.findUnique({
    where: { id: s.userId },
    select: { id: true, role: true, status: true },
  });
  if (!user) return { ok: false, error: "Non autorisé", status: 401 };
  if (user.status !== "ACTIVE") return { ok: false, error: "Compte suspendu", status: 403 };

  return { ok: true, userId: user.id, role: user.role };
}
