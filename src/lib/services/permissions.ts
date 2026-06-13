import type { PlanTier } from "@prisma/client";

/**
 * Permissions et avantages par plan Yourazz.
 *
 * Source de vérité unique pour : ce que chaque plan peut faire (feature flags,
 * vérifiés côté serveur) et ce qui est affiché à l'utilisateur (métadonnées UI).
 * Fichier sans dépendance serveur → importable côté client comme serveur.
 */

export type Feature =
  | "paymentLink"        // lien de paiement
  | "basicDashboard"     // tableau de bord
  | "standardSupport"
  | "prioritySupport"
  | "multiCurrency"      // EUR / USD / GBP
  | "customLogo"         // logo + couleur personnalisés sur la page de paiement
  | "advancedStats"      // statistiques avancées
  | "apiAccess"          // API complète
  | "dedicatedSupport"   // accompagnement dédié
  | "unlimitedVolume";   // encaissement illimité

export const PLAN_FEATURES: Record<PlanTier, Feature[]> = {
  STARTER: ["paymentLink", "basicDashboard", "standardSupport"],
  PRO: ["paymentLink", "basicDashboard", "prioritySupport", "multiCurrency", "customLogo"],
  BUSINESS: [
    "paymentLink",
    "basicDashboard",
    "prioritySupport",
    "multiCurrency",
    "customLogo",
    "advancedStats",
    "apiAccess",
    "dedicatedSupport",
    "unlimitedVolume",
  ],
};

/** Vérifie qu'un plan donne accès à une fonctionnalité. Les admins ont tout. */
export function hasFeature(plan: PlanTier, feature: Feature, opts?: { isAdmin?: boolean }): boolean {
  if (opts?.isAdmin) return true;
  return PLAN_FEATURES[plan].includes(feature);
}

export type PlanPermissions = Record<Feature, boolean>;

export function getPlanPermissions(plan: PlanTier, opts?: { isAdmin?: boolean }): PlanPermissions {
  const all: Feature[] = [
    "paymentLink",
    "basicDashboard",
    "standardSupport",
    "prioritySupport",
    "multiCurrency",
    "customLogo",
    "advancedStats",
    "apiAccess",
    "dedicatedSupport",
    "unlimitedVolume",
  ];
  return all.reduce((acc, f) => {
    acc[f] = hasFeature(plan, f, opts);
    return acc;
  }, {} as PlanPermissions);
}

// ─── Métadonnées d'affichage (couleurs, badges, avantages listés) ────────────

export interface PlanMeta {
  tier: PlanTier;
  name: string;
  tagline: string;
  /** clé de couleur pour différencier visuellement (mappée en Tailwind dans l'UI) */
  accent: "zinc" | "brand" | "amber";
  requiresKey: boolean; // Pro/Business nécessitent une clé d'activation après paiement
  benefits: string[];
}

export const PLAN_META: Record<PlanTier, PlanMeta> = {
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    tagline: "Pour démarrer gratuitement",
    accent: "zinc",
    requiresKey: false,
    benefits: ["Lien de paiement", "Dashboard basique", "Support standard", "Plafond 500 €/mois"],
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    tagline: "Pour les vendeurs réguliers",
    accent: "brand",
    requiresKey: true,
    benefits: [
      "Tout le plan Starter",
      "Support prioritaire",
      "Multi-devises (EUR, USD, GBP)",
      "Logo personnalisé",
      "Plafond 1 500 €/mois",
    ],
  },
  BUSINESS: {
    tier: "BUSINESS",
    name: "Business",
    tagline: "Pour les professionnels",
    accent: "amber",
    requiresKey: true,
    benefits: [
      "Tout le plan Pro",
      "Encaissement illimité",
      "API complète",
      "Statistiques avancées",
      "Accompagnement dédié",
      "Fonctionnalités premium",
    ],
  },
};
