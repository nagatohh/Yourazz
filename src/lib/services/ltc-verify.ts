/**
 * Vérification on-chain des paiements Litecoin.
 *
 * Avant d'émettre une clé d'activation, on vérifie sur la blockchain que le
 * TXID soumis :
 *   1. existe réellement (anti-faux-TXID) ;
 *   2. paie bien l'adresse de réception attendue ;
 *   3. pour un montant ≥ au prix du plan acheté ;
 *   4. avec un nombre minimal de confirmations.
 *
 * Provider par défaut : BlockCypher (API publique, sans clé requise — un token
 * optionnel `BLOCKCYPHER_TOKEN` relève les quotas). Désactivable via
 * `LTC_VERIFY_ENABLED=false` (retour au contrôle 100 % manuel).
 */

const LITOSHI_PER_LTC = 100_000_000;

export interface LtcVerifyResult {
  ok: boolean;
  /** échec « doux » = vérification indisponible (API HS) : l'admin peut overrider. */
  soft: boolean;
  reason:
    | "VERIFIED"
    | "DISABLED"
    | "NOT_FOUND"
    | "WRONG_ADDRESS"
    | "INSUFFICIENT_AMOUNT"
    | "TOO_FEW_CONFIRMATIONS"
    | "UNAVAILABLE";
  paidLtc: number | null;
  expectedLtc: number | null;
  confirmations: number | null;
  message: string;
}

export function isLtcVerificationEnabled(): boolean {
  return (process.env.LTC_VERIFY_ENABLED ?? "true").toLowerCase() !== "false";
}

function minConfirmations(): number {
  const n = parseInt(process.env.LTC_MIN_CONFIRMATIONS ?? "1", 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

interface BlockCypherTx {
  confirmations?: number;
  outputs?: { value?: number; addresses?: string[] }[];
}

async function fetchTx(txid: string): Promise<BlockCypherTx | null> {
  const token = process.env.BLOCKCYPHER_TOKEN ? `?token=${process.env.BLOCKCYPHER_TOKEN}` : "";
  const url = `https://api.blockcypher.com/v1/ltc/main/txs/${encodeURIComponent(txid)}${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (res.status === 404) return null; // TX inexistante
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BlockCypherTx;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Vérifie un paiement. `expectedLtc` vide/0 → le contrôle de montant est sauté
 * (mais existence + adresse + confirmations restent vérifiés).
 */
export async function verifyLitecoinPayment(params: {
  txid: string;
  address: string;
  expectedLtc?: string | number | null;
}): Promise<LtcVerifyResult> {
  const expected =
    params.expectedLtc != null && `${params.expectedLtc}`.trim() !== ""
      ? Number(params.expectedLtc)
      : null;

  if (!isLtcVerificationEnabled()) {
    return { ok: true, soft: false, reason: "DISABLED", paidLtc: null, expectedLtc: expected, confirmations: null, message: "Vérification on-chain désactivée." };
  }

  let tx: BlockCypherTx | null;
  try {
    tx = await fetchTx(params.txid.trim());
  } catch {
    return { ok: false, soft: true, reason: "UNAVAILABLE", paidLtc: null, expectedLtc: expected, confirmations: null, message: "Vérification on-chain indisponible (API). Vérifiez manuellement avant de confirmer." };
  }

  if (!tx) {
    return { ok: false, soft: false, reason: "NOT_FOUND", paidLtc: null, expectedLtc: expected, confirmations: null, message: "Transaction introuvable sur la blockchain Litecoin (TXID invalide)." };
  }

  const confirmations = tx.confirmations ?? 0;
  const litoshiToAddress = (tx.outputs ?? [])
    .filter((o) => Array.isArray(o.addresses) && o.addresses.includes(params.address))
    .reduce((sum, o) => sum + (o.value ?? 0), 0);
  const paidLtc = litoshiToAddress / LITOSHI_PER_LTC;

  if (litoshiToAddress <= 0) {
    return { ok: false, soft: false, reason: "WRONG_ADDRESS", paidLtc: 0, expectedLtc: expected, confirmations, message: "Cette transaction ne paie pas l'adresse de réception attendue." };
  }

  // Tolérance de 0,5 % pour l'arrondi / micro-variation. Le surpaiement est accepté.
  if (expected != null && expected > 0 && paidLtc < expected * 0.995) {
    return { ok: false, soft: false, reason: "INSUFFICIENT_AMOUNT", paidLtc, expectedLtc: expected, confirmations, message: `Montant insuffisant : ${paidLtc} LTC reçus pour ${expected} LTC attendus.` };
  }

  if (confirmations < minConfirmations()) {
    return { ok: false, soft: true, reason: "TOO_FEW_CONFIRMATIONS", paidLtc, expectedLtc: expected, confirmations, message: `Paiement détecté mais ${confirmations} confirmation(s) seulement (minimum ${minConfirmations()}). Réessayez plus tard.` };
  }

  return { ok: true, soft: false, reason: "VERIFIED", paidLtc, expectedLtc: expected, confirmations, message: `Paiement vérifié on-chain : ${paidLtc} LTC, ${confirmations} confirmation(s).` };
}
