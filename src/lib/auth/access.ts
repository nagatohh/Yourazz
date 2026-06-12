import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type AccessCheck =
  | { ok: true; userId: string; role: string }
  | { ok: false; error: string; status: 401 | 402 | 403 };

/**
 * Garde d'accès des routes financières : session valide + compte non
 * suspendu + abonnement Yourazz Access actif. Les admins ne sont pas
 * soumis à l'abonnement mais restent soumis au statut de compte.
 */
export async function requireActiveAccess(): Promise<AccessCheck> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Non autorisé", status: 401 };

  const user = await db.user.findUnique({
    where: { id: s.userId },
    select: { id: true, role: true, status: true, accessStatus: true },
  });
  if (!user) return { ok: false, error: "Non autorisé", status: 401 };
  if (user.status !== "ACTIVE") return { ok: false, error: "Compte suspendu", status: 403 };

  const isAdmin = user.role === "ADMIN" || user.role === "ADMIN_OWNER";
  if (!isAdmin && user.accessStatus !== "ACTIVE") {
    return { ok: false, error: "Abonnement Yourazz Access requis", status: 402 };
  }

  return { ok: true, userId: user.id, role: user.role };
}
