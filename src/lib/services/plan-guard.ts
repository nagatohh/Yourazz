import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type Feature,
  hasFeature,
  meetsPlan,
  minPlanForFeature,
  FEATURE_LABEL,
  PLAN_META,
} from "./permissions";

/**
 * Gardes de plan côté serveur.
 *
 * Règle de sécurité : le plan est TOUJOURS relu depuis la base (jamais depuis
 * le JWT ni le frontend). Une fonctionnalité premium reste donc bloquée même
 * si l'utilisateur modifie le HTML, appelle l'API à la main ou force une URL.
 *
 * Usage type dans une route :
 *   const guard = await requireFeatureApi("advancedStats");
 *   if (!guard.ok) return guard.response;        // 403 { error:"PLAN_REQUIRED", ... }
 *   // … guard.viewer est l'utilisateur vérifié
 */

export interface Viewer {
  id: string;
  plan: PlanTier;
  role: string;
  isAdmin: boolean;
}

/** Charge le plan RÉEL de l'utilisateur connecté depuis la DB. null si non connecté / inactif. */
export async function getViewer(): Promise<Viewer | null> {
  const s = await getSession();
  if (!s) return null;
  const u = await db.user.findUnique({
    where: { id: s.userId },
    select: { id: true, plan: true, role: true, status: true },
  });
  if (!u || u.status !== "ACTIVE") return null;
  const isAdmin = u.role === "ADMIN" || u.role === "ADMIN_OWNER";
  return { id: u.id, plan: u.plan, role: u.role, isAdmin };
}

const unauthorized = () =>
  NextResponse.json({ error: "UNAUTHORIZED", message: "Connectez-vous pour continuer." }, { status: 401 });

/** Réponse d'erreur 403 standardisée quand le plan est insuffisant. */
export function planRequiredJson(requiredPlan: PlanTier, message?: string): NextResponse {
  return NextResponse.json(
    {
      error: "PLAN_REQUIRED",
      requiredPlan,
      message:
        message ?? `Cette fonctionnalité est réservée aux utilisateurs ${PLAN_META[requiredPlan].name}.`,
    },
    { status: 403 },
  );
}

export type Guard = { ok: true; viewer: Viewer } | { ok: false; response: NextResponse };

/** Garde API par fonctionnalité (ex. "advancedStats", "customLogo", "multiCurrency", "apiAccess"). */
export async function requireFeatureApi(feature: Feature): Promise<Guard> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, response: unauthorized() };
  if (!hasFeature(viewer.plan, feature, { isAdmin: viewer.isAdmin })) {
    return {
      ok: false,
      response: planRequiredJson(
        minPlanForFeature(feature),
        `« ${FEATURE_LABEL[feature]} » nécessite un plan supérieur.`,
      ),
    };
  }
  return { ok: true, viewer };
}

/** Garde API par plan minimum (ex. "PRO", "BUSINESS"). Les admins passent toujours. */
export async function requirePlanApi(plan: PlanTier): Promise<Guard> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, response: unauthorized() };
  if (!viewer.isAdmin && !meetsPlan(viewer.plan, plan)) {
    return { ok: false, response: planRequiredJson(plan) };
  }
  return { ok: true, viewer };
}

/**
 * Vérification pure sur un utilisateur DÉJÀ chargé (sans relire la session) —
 * utile quand le bénéficiaire est déjà en mémoire (ex. flux de paiement).
 * Retourne le plan minimum requis si bloqué, sinon null.
 */
export function featureGate(
  user: { plan: PlanTier; role?: string | null },
  feature: Feature,
): PlanTier | null {
  const isAdmin = user.role === "ADMIN" || user.role === "ADMIN_OWNER";
  if (hasFeature(user.plan, feature, { isAdmin })) return null;
  return minPlanForFeature(feature);
}
