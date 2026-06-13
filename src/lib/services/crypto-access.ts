import crypto from "crypto";
import QRCode from "qrcode";
import type { PlanTier } from "@prisma/client";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/services/plans";

/**
 * Abonnements Yourazz payés en Litecoin (LTC).
 *
 * Flux : l'utilisateur choisit un plan (Pro ou Business), paie en LTC, soumet
 * son TXID ; un admin vérifie puis émet une clé d'activation TYPÉE (PRO ou
 * BUSINESS). La clé applique exactement son plan (User.plan) — une clé PRO ne
 * peut jamais activer Business et inversement, car le plan est porté par la
 * clé en base (champ autoritaire), pas déduit du texte saisi.
 *
 * Starter est gratuit et immédiat : aucune clé requise.
 */

export type PaidPlan = "PRO" | "BUSINESS";

export function isPaidPlan(p: string): p is PaidPlan {
  return p === "PRO" || p === "BUSINESS";
}

// ─── Configuration de paiement (par plan) ────────────────────────────────────

export interface CryptoAccessConfig {
  plan: PaidPlan;
  address: string;
  amount: string;   // montant en LTC, ex "0.12" — vide = montant libre
  priceEur: number; // prix de référence en centimes d'euro
  label: string;
  configured: boolean;
}

/**
 * Config LTC d'un plan. Adresse : `LTC_ADDRESS_PRO`/`LTC_ADDRESS_BUSINESS` si
 * définie (adresse distincte par plan), sinon l'adresse partagée `LTC_ADDRESS`.
 * Montant LTC : `LTC_PRICE_PRO`/`LTC_PRICE_BUSINESS`.
 */
export function getCryptoAccessConfig(plan: PaidPlan): CryptoAccessConfig {
  const address = (process.env[`LTC_ADDRESS_${plan}`] || process.env.LTC_ADDRESS || "").trim();
  const amount = (process.env[`LTC_PRICE_${plan}`] || "").trim();
  return {
    plan,
    address,
    amount,
    priceEur: PLANS[plan].price,
    label: `Yourazz ${PLANS[plan].name}`,
    configured: address.length > 0,
  };
}

/** URI de paiement standard `litecoin:` (compatible wallets + QR). */
export function buildLitecoinUri(cfg: CryptoAccessConfig): string {
  if (!cfg.configured) return "";
  const params = new URLSearchParams();
  if (cfg.amount) params.set("amount", cfg.amount);
  if (cfg.label) params.set("label", cfg.label);
  const qs = params.toString();
  return `litecoin:${cfg.address}${qs ? `?${qs}` : ""}`;
}

/** QR code encodé en data URI (autorisé par la CSP `img-src data:`). */
export async function generatePaymentQr(cfg: CryptoAccessConfig): Promise<string | null> {
  const uri = buildLitecoinUri(cfg);
  if (!uri) return null;
  try {
    return await QRCode.toDataURL(uri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

/** Référence courte unique d'une commande, ex `YZ-3F9A2C7B`. */
export function generateOrderReference(): string {
  return `YZ-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// ─── Validation TXID ─────────────────────────────────────────────────────────

/** TXID Litecoin = hash hexadécimal 64 caractères. */
export function isValidTxid(txid: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(txid.trim());
}

export function normalizeTxid(txid: string): string {
  return txid.trim().toLowerCase();
}

// ─── Clés d'activation typées par plan ───────────────────────────────────────

// Alphabet Crockford base32 (sans I, L, O, U : évite les confusions de lecture).
const KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEY_GROUPS = 3;
const KEY_GROUP_LEN = 5;

function randomGroup(len: number): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  return out;
}

/** Génère une clé lisible préfixée par le plan, ex `PRO-7K2M9-4XQT1-PND8R`. */
export function generateActivationKey(plan: PaidPlan): string {
  const groups = Array.from({ length: KEY_GROUPS }, () => randomGroup(KEY_GROUP_LEN));
  return `${plan}-${groups.join("-")}`;
}

/** Forme canonique : majuscules, caractères alphanumériques uniquement.
 *  Permet à l'utilisateur de saisir la clé avec ou sans tirets/espaces. */
export function canonicalizeKey(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashKey(input: string): string {
  return crypto.createHash("sha256").update(canonicalizeKey(input)).digest("hex");
}

// ─── Journalisation ──────────────────────────────────────────────────────────

export type ActivationAction =
  | "KEY_GENERATED"
  | "KEY_REDEEMED"
  | "KEY_SUSPENDED"
  | "KEY_REACTIVATED"
  | "KEY_EXPIRED"
  | "KEY_INVALID_ATTEMPT";

/** Journal dédié aux clés. Ne lève jamais : un log perdu ne doit pas faire
 *  échouer une activation. */
export async function logActivation(params: {
  action: ActivationAction;
  keyId?: string | null;
  userId?: string | null;
  email?: string | null;
  success?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.activationLog.create({
      data: {
        action: params.action,
        keyId: params.keyId ?? null,
        userId: params.userId ?? null,
        email: params.email ?? null,
        success: params.success ?? true,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: (params.metadata ?? undefined) as never,
      },
    });
  } catch (e) {
    console.error("ACTIVATION_LOG_ERROR:", e);
  }
}

// ─── Génération + persistance d'une clé ──────────────────────────────────────

export interface GenerateKeyOptions {
  plan: PaidPlan;
  createdBy: string; // id admin
  userId?: string | null; // compte lié (recommandé)
  cryptoPaymentId?: string | null;
  expiresInDays?: number | null;
  note?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Crée une clé unique typée et la persiste. Réessaie en cas de collision. */
export async function createActivationKey(opts: GenerateKeyOptions) {
  const expiresAt =
    opts.expiresInDays && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateActivationKey(opts.plan);
    const keyHash = hashKey(key);
    try {
      const created = await db.activationKey.create({
        data: {
          key,
          keyHash,
          plan: opts.plan,
          userId: opts.userId ?? null,
          createdBy: opts.createdBy,
          cryptoPaymentId: opts.cryptoPaymentId ?? null,
          expiresAt,
          note: opts.note ?? null,
        },
      });

      await logActivation({
        action: "KEY_GENERATED",
        keyId: created.id,
        userId: opts.userId ?? null,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
        metadata: { plan: opts.plan, cryptoPaymentId: opts.cryptoPaymentId ?? null, expiresAt },
      });

      return created;
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("KEY_GENERATION_FAILED");
}

// ─── Validation d'une clé (redemption) ───────────────────────────────────────

export type RedeemResult =
  | { ok: true; keyId: string; plan: PaidPlan }
  | {
      ok: false;
      code: "INVALID" | "USED" | "SUSPENDED" | "EXPIRED" | "WRONG_ACCOUNT";
      message: string;
    };

/**
 * Valide une clé pour le compte `userId`. Applique exactement le plan porté par
 * la clé (User.plan ← key.plan). Usage unique garanti par une mise à jour
 * conditionnelle atomique (`updateMany where status=ACTIVE`).
 */
export async function redeemActivationKey(params: {
  rawKey: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<RedeemResult> {
  const keyHash = hashKey(params.rawKey);
  const key = await db.activationKey.findUnique({ where: { keyHash } });

  const fail = async (
    code: "INVALID" | "USED" | "SUSPENDED" | "EXPIRED" | "WRONG_ACCOUNT",
    message: string,
    keyId: string | null,
    reason: string,
  ): Promise<RedeemResult> => {
    await logActivation({
      action: "KEY_INVALID_ATTEMPT",
      keyId,
      userId: params.userId,
      success: false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { reason },
    });
    return { ok: false, code, message };
  };

  if (!key) return fail("INVALID", "Clé invalide.", null, "not_found");

  if (key.status === "SUSPENDED" || key.status === "REVOKED") {
    return fail("SUSPENDED", "Cette clé a été suspendue.", key.id, "suspended");
  }
  if (key.status === "USED") {
    return fail("USED", "Cette clé a déjà été utilisée.", key.id, "already_used");
  }
  if (key.status === "EXPIRED") {
    return fail("EXPIRED", "Cette clé a expiré.", key.id, "expired");
  }

  // Expiration automatique : une clé ACTIVE dont la date est dépassée est
  // désactivée à la volée.
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    await db.activationKey.updateMany({
      where: { id: key.id, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    });
    return fail("EXPIRED", "Cette clé a expiré.", key.id, "expired");
  }

  // Clé liée à un autre compte → refus (clé personnelle, non transférable).
  if (key.userId && key.userId !== params.userId) {
    return fail("WRONG_ACCOUNT", "Cette clé est liée à un autre compte.", key.id, "wrong_account");
  }

  const plan = (key.plan === "BUSINESS" ? "BUSINESS" : "PRO") as PaidPlan;

  // Consommation atomique : seule la transaction qui fait passer ACTIVE→USED gagne.
  const claim = await db.activationKey.updateMany({
    where: { id: key.id, status: "ACTIVE" },
    data: {
      status: "USED",
      usedAt: new Date(),
      usedByIp: params.ipAddress ?? null,
      userId: key.userId ?? params.userId,
    },
  });

  if (claim.count !== 1) {
    return fail("USED", "Cette clé a déjà été utilisée.", key.id, "race_already_used");
  }

  // Applique le plan exact + accès actif. setUserPlan trace dans AuditLog.
  const { setUserPlan } = await import("@/lib/services/plans");
  await setUserPlan(params.userId, plan, "activation_key");
  await db.user.update({ where: { id: params.userId }, data: { accessStatus: "ACTIVE" } });

  await Promise.all([
    db.auditLog.create({
      data: {
        userId: params.userId,
        action: "ACCESS_ACTIVATED",
        target: key.id,
        metadata: { source: "activation_key", plan },
      },
    }),
    logActivation({
      action: "KEY_REDEEMED",
      keyId: key.id,
      userId: params.userId,
      success: true,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { plan },
    }),
  ]);

  return { ok: true, keyId: key.id, plan };
}
