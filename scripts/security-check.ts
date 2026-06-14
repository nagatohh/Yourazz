/**
 * Tests de sécurité — invariants critiques du système d'abonnement / clés.
 * Lancer : npm run security:check
 *
 * Ne touche PAS la base de données : teste la logique pure (permissions,
 * génération/validation de clés) + une vérification on-chain best-effort.
 */
import {
  hasFeature,
  PLAN_FEATURES,
} from "../src/lib/services/permissions";
import {
  generateActivationKey,
  canonicalizeKey,
  hashKey,
} from "../src/lib/services/crypto-access";
import { verifyLitecoinPayment, isLtcVerificationEnabled } from "../src/lib/services/ltc-verify";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  \x1b[32mPASS\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}`);
  }
}

async function main() {
  console.log("\n=== Permissions (gating par plan, côté serveur) ===");
  check("Starter n'a PAS le multi-devises", !hasFeature("STARTER", "multiCurrency"));
  check("Starter n'a PAS le logo perso", !hasFeature("STARTER", "customLogo"));
  check("Starter n'a PAS l'API", !hasFeature("STARTER", "apiAccess"));
  check("Pro a le multi-devises", hasFeature("PRO", "multiCurrency"));
  check("Pro a le logo perso", hasFeature("PRO", "customLogo"));
  check("Pro n'a PAS l'API (Business only)", !hasFeature("PRO", "apiAccess"));
  check("Business a l'API", hasFeature("BUSINESS", "apiAccess"));
  check("Business a l'encaissement illimité", hasFeature("BUSINESS", "unlimitedVolume"));
  check("Business a les stats avancées", hasFeature("BUSINESS", "advancedStats"));
  check("Admin override : Starter+admin a tout", hasFeature("STARTER", "apiAccess", { isAdmin: true }));
  check("Business inclut toutes les features Pro (montée en gamme)",
    PLAN_FEATURES.PRO.every((f) => PLAN_FEATURES.BUSINESS.includes(f)));
  check("Nombre de features croissant Starter < Pro < Business",
    PLAN_FEATURES.STARTER.length < PLAN_FEATURES.PRO.length &&
    PLAN_FEATURES.PRO.length < PLAN_FEATURES.BUSINESS.length);

  console.log("\n=== Clés d'activation (typage, unicité, imprévisibilité) ===");
  check("Clé PRO préfixée PRO-", generateActivationKey("PRO").startsWith("PRO-"));
  check("Clé BUSINESS préfixée BUSINESS-", generateActivationKey("BUSINESS").startsWith("BUSINESS-"));

  const N = 5000;
  const set = new Set<string>();
  for (let i = 0; i < N; i++) set.add(generateActivationKey("PRO"));
  check(`${N} clés générées sans collision (imprévisibilité)`, set.size === N);

  const sample = generateActivationKey("PRO");
  check("Alphabet sans caractères ambigus (I,L,O,U)", !/[ILOU]/.test(sample.replace("PRO-", "")));

  const k = "PRO-7K2M9-4XQT1-PND8R";
  check("Hash déterministe", hashKey(k) === hashKey(k));
  check("Canonicalisation tolère casse/espaces/tirets",
    hashKey(k) === hashKey(" pro 7k2m9 4xqt1 pnd8r "));
  check("Deux clés différentes → hash différents",
    hashKey("PRO-AAAAA-BBBBB-CCCCC") !== hashKey("PRO-AAAAA-BBBBB-CCCCD"));
  check("canonicalizeKey retire tout sauf alphanumérique",
    canonicalizeKey("pro-7k2m9!!") === "PRO7K2M9");

  console.log("\n=== Vérification on-chain Litecoin (anti-faux-TXID) ===");
  check("Vérification activée par défaut", isLtcVerificationEnabled());
  try {
    const fake = await verifyLitecoinPayment({
      txid: "f".repeat(64),
      address: "LdSQopvsNwkqBzksksiy8KCdzZx6R9ubB3",
      expectedLtc: "0.10",
    });
    check("Faux TXID rejeté (NOT_FOUND, échec dur)", fake.ok === false && fake.reason === "NOT_FOUND" && fake.soft === false);
  } catch {
    console.log("  \x1b[33mSKIP\x1b[0m vérification réseau indisponible (hors-ligne)");
  }

  console.log(`\n=== Résultat : ${passed} réussis, ${failed} échoués ===\n`);
  // process.exitCode (et non process.exit) : laisse l'event loop se vider
  // proprement (évite l'abort libuv sur Windows lié au socket réseau).
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("ERREUR:", e);
  process.exitCode = 1;
});
