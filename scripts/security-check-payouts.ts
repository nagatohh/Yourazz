/**
 * Garde statique des invariants de retrait (à lancer en CI) :
 *   1. Tout appel `payouts.create(` doit être scopé `stripeAccount` (compte Connect).
 *   2. Le provider plateforme doit refuser tout payout (PLATFORM_PAYOUT_FORBIDDEN).
 *   3. (warning) Tout `balance.retrieve(` hors admin doit être scopé `stripeAccount`.
 *
 * Exit code != 0 si un invariant dur est violé. Aucun accès DB/réseau.
 *
 *   npm run security:payouts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");
const WINDOW = 500; // fenêtre de recherche après l'appel (args inclus)

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function findCalls(src: string, needle: string): number[] {
  const idx: number[] = [];
  let i = src.indexOf(needle);
  while (i !== -1) {
    idx.push(i);
    i = src.indexOf(needle, i + needle.length);
  }
  return idx;
}

const errors: string[] = [];
const warnings: string[] = [];
const files = walk(SRC);

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const rel = file.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", "");

  // 1. payouts.create → DOIT contenir stripeAccount dans la fenêtre d'arguments
  for (const i of findCalls(src, "payouts.create(")) {
    const win = src.slice(i, i + WINDOW);
    if (!win.includes("stripeAccount")) {
      errors.push(`${rel}: payouts.create(...) sans { stripeAccount } → payout plateforme possible !`);
    }
  }

  // 3. balance.retrieve → warning si non scopé (l'admin peut légitimement lire le solde plateforme)
  for (const i of findCalls(src, "balance.retrieve(")) {
    const win = src.slice(i, i + WINDOW);
    if (!win.includes("stripeAccount") && !rel.includes("admin")) {
      warnings.push(`${rel}: balance.retrieve(...) sans { stripeAccount } (vérifier que c'est volontaire)`);
    }
  }
}

// 2. Le provider plateforme doit refuser tout payout
const providerPath = join(SRC, "lib", "payments", "stripe.ts");
try {
  const provider = readFileSync(providerPath, "utf8");
  if (!provider.includes("PLATFORM_PAYOUT_FORBIDDEN")) {
    errors.push("lib/payments/stripe.ts: createPayout ne refuse plus le payout plateforme (PLATFORM_PAYOUT_FORBIDDEN manquant)");
  }
} catch {
  warnings.push("lib/payments/stripe.ts introuvable — vérifier le provider plateforme");
}

for (const w of warnings) console.warn("⚠️  " + w);
if (errors.length) {
  console.error("\n❌ Invariants de retrait VIOLÉS :");
  for (const e of errors) console.error("   - " + e);
  process.exit(1);
}
console.log(`✅ Invariants de retrait OK (${files.length} fichiers scannés, ${warnings.length} avertissement(s)).`);
