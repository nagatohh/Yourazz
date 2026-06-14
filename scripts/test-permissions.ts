/**
 * Test de sécurité — matrice de permissions par plan.
 *
 * Vérifie la SOURCE DE VÉRITÉ (`src/lib/services/permissions.ts`) utilisée par
 * toutes les gardes serveur (`requireFeatureApi` / `requirePlanApi`). Si un plan
 * gagne ou perd une fonctionnalité par erreur, ce test casse.
 *
 * Lancer :  npm run test:permissions   (ou : npx tsx scripts/test-permissions.ts)
 * Aucune base de données ni serveur requis.
 *
 * ── Vérification runtime complémentaire (manuelle) ──────────────────────────
 * En tant que compte STARTER connecté, ces appels doivent renvoyer
 * 403 { "error":"PLAN_REQUIRED", "requiredPlan":"…" } :
 *   curl -X PATCH  https://yourazz.xyz/api/payment-link   -d '{"logoUrl":"https://x/y.png"}'
 *   curl          https://yourazz.xyz/api/analytics/advanced
 */

import {
  hasFeature,
  meetsPlan,
  minPlanForFeature,
  getPlanPermissions,
  PLAN_FEATURES,
  FEATURE_LABEL,
  type Feature,
} from "../src/lib/services/permissions";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ ${name}`);
  }
}

const PREMIUM: Feature[] = ["multiCurrency", "customLogo", "advancedStats", "apiAccess", "unlimitedVolume", "dedicatedSupport"];

console.log("\n🔐 Test des permissions par plan\n");

// ── STARTER : aucune fonctionnalité premium ──────────────────────────────────
check("STARTER a le lien de paiement", hasFeature("STARTER", "paymentLink"));
check("STARTER a le dashboard", hasFeature("STARTER", "basicDashboard"));
for (const f of PREMIUM) {
  check(`STARTER n'a PAS ${f}`, !hasFeature("STARTER", f));
}

// ── PRO : Pro oui, Business non ──────────────────────────────────────────────
check("PRO a customLogo", hasFeature("PRO", "customLogo"));
check("PRO a multiCurrency", hasFeature("PRO", "multiCurrency"));
check("PRO a prioritySupport", hasFeature("PRO", "prioritySupport"));
check("PRO n'a PAS advancedStats", !hasFeature("PRO", "advancedStats"));
check("PRO n'a PAS apiAccess", !hasFeature("PRO", "apiAccess"));
check("PRO n'a PAS unlimitedVolume", !hasFeature("PRO", "unlimitedVolume"));

// ── BUSINESS : tout (sauf standardSupport, remplacé par prioritySupport) ─────
for (const f of Object.keys(FEATURE_LABEL) as Feature[]) {
  if (f === "standardSupport") continue;
  check(`BUSINESS a ${f}`, hasFeature("BUSINESS", f));
}
check(
  "BUSINESS a prioritySupport et PAS standardSupport",
  hasFeature("BUSINESS", "prioritySupport") && !hasFeature("BUSINESS", "standardSupport"),
);

// ── Admin : bypass total, même en STARTER ────────────────────────────────────
for (const f of PREMIUM) {
  check(`ADMIN (plan STARTER) a ${f}`, hasFeature("STARTER", f, { isAdmin: true }));
}

// ── Hiérarchie des plans ─────────────────────────────────────────────────────
check("BUSINESS ≥ PRO", meetsPlan("BUSINESS", "PRO"));
check("PRO ≥ PRO", meetsPlan("PRO", "PRO"));
check("PRO ≥ STARTER", meetsPlan("PRO", "STARTER"));
check("STARTER < PRO", !meetsPlan("STARTER", "PRO"));
check("PRO < BUSINESS", !meetsPlan("PRO", "BUSINESS"));

// ── Plan minimum par fonctionnalité ──────────────────────────────────────────
check("minPlan(paymentLink) = STARTER", minPlanForFeature("paymentLink") === "STARTER");
check("minPlan(customLogo) = PRO", minPlanForFeature("customLogo") === "PRO");
check("minPlan(multiCurrency) = PRO", minPlanForFeature("multiCurrency") === "PRO");
check("minPlan(advancedStats) = BUSINESS", minPlanForFeature("advancedStats") === "BUSINESS");
check("minPlan(apiAccess) = BUSINESS", minPlanForFeature("apiAccess") === "BUSINESS");
check("minPlan(unlimitedVolume) = BUSINESS", minPlanForFeature("unlimitedVolume") === "BUSINESS");

// ── getPlanPermissions cohérent avec hasFeature ──────────────────────────────
const starterPerms = getPlanPermissions("STARTER");
check("getPlanPermissions(STARTER).customLogo = false", starterPerms.customLogo === false);
check("getPlanPermissions(STARTER).paymentLink = true", starterPerms.paymentLink === true);

// ── Cohérence interne : chaque feature de PLAN_FEATURES a un libellé ──────────
for (const tier of ["STARTER", "PRO", "BUSINESS"] as const) {
  for (const f of PLAN_FEATURES[tier]) {
    check(`FEATURE_LABEL existe pour ${f}`, typeof FEATURE_LABEL[f] === "string");
  }
}

console.log(`\n${failed === 0 ? "✅" : "⚠️ "} ${passed} assertions OK, ${failed} échec(s)\n`);
process.exit(failed === 0 ? 0 : 1);
