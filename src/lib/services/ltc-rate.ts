/**
 * Cours Litecoin/EUR en direct, pour facturer les abonnements payés en LTC au
 * prix EUR de référence (Pro 7,99 € / Business 19,99 €) sans valeur figée.
 *
 * - Cache mémoire court (TTL) : évite de marteler l'API et reste rapide.
 * - Sources multiples avec repli (CoinGecko → Coinbase).
 * - Marge de sécurité configurable (volatilité + frais réseau pendant le délai
 *   de confirmation), env `LTC_PRICE_MARGIN_PCT` (défaut 2 %).
 * - Si toutes les sources échouent : repli sur la valeur fixe `LTC_PRICE_*`
 *   (définie dans Vercel) — d'où l'intérêt de garder ces variables.
 */

let cache: { rate: number; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(4500),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fromCoinGecko(): Promise<number | null> {
  const j = (await fetchJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=eur",
  )) as { litecoin?: { eur?: number } };
  const v = j?.litecoin?.eur;
  return typeof v === "number" && v > 0 ? v : null;
}

async function fromCoinbase(): Promise<number | null> {
  const j = (await fetchJson("https://api.coinbase.com/v2/prices/LTC-EUR/spot")) as {
    data?: { amount?: string };
  };
  const v = parseFloat(j?.data?.amount ?? "");
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Cours LTC→EUR courant (un LTC vaut N euros). null si indisponible. */
export async function getLtcEurRate(): Promise<number | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rate;

  for (const source of [fromCoinGecko, fromCoinbase]) {
    try {
      const rate = await source();
      if (rate) {
        cache = { rate, at: Date.now() };
        return rate;
      }
    } catch {
      // source suivante
    }
  }
  // Mieux vaut un cours périmé que rien (l'appelant a aussi un repli env).
  return cache?.rate ?? null;
}

function marginPct(): number {
  const n = parseFloat(process.env.LTC_PRICE_MARGIN_PCT ?? "2");
  return Number.isFinite(n) && n >= 0 ? n : 2;
}

/**
 * Montant LTC (chaîne, 4 décimales) pour un prix en centimes d'euro, au cours
 * courant + marge. Repli sur `fallbackEnv` si le cours est indisponible.
 * Retourne "" si rien n'est disponible (→ « montant libre »).
 */
export async function ltcAmountForEur(priceCents: number, fallbackEnv?: string): Promise<string> {
  const rate = await getLtcEurRate();
  if (rate && priceCents > 0) {
    const ltc = (priceCents / 100 / rate) * (1 + marginPct() / 100);
    // Arrondi au-dessus à 4 décimales (favorable au vendeur, jamais sous le prix).
    return (Math.ceil(ltc * 10000) / 10000).toFixed(4);
  }
  return (fallbackEnv ?? "").trim();
}
