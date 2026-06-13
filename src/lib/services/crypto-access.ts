import crypto from "crypto";
import QRCode from "qrcode";
import { db } from "@/lib/db";

/**
 * Yourazz Access — paiement par cryptomonnaie (Litecoin).
 *
 * Flux : l'utilisateur paie en LTC sur l'adresse de réception, soumet son TXID,
 * un admin vérifie puis émet une clé d'activation unique. La clé débloque
 * l'accès (User.accessStatus → ACTIVE).
 *
 * Règle de sécurité : aucun statut de paiement ou d'accès n'est modifié sans
 * action admin explicite ou validation d'une clé valide non utilisée.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface CryptoAccessConfig {
  address: string;
  amount: string; // montant en LTC, ex "0.45" — vide = libre
  label: string;
  configured: boolean;
}

export function getCryptoAccessConfig(): CryptoAccessConfig {
  const address = (process.env.LTC_ADDRESS || "").trim();
  return {
    address,
    amount: (process.env.LTC_ACCESS_AMOUNT || "").trim(),
    label: (process.env.LTC_ACCESS_LABEL || "Accès Yourazz").trim(),
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

// ─── Validation TXID ─────────────────────────────────────────────────────────

/** TXID Litecoin = hash hexadécimal 64 caractères. */
export function isValidTxid(txid: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(txid.trim());
}

export function normalizeTxid(txid: string): string {
  return txid.trim().toLowerCase();
}

// ─── Clés d'activation ───────────────────────────────────────────────────────

// Alphabet Crockford base32 (sans I, L, O, U : évite les confusions de lecture).
const KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEY_PREFIX = "YRZ";
const KEY_GROUPS = 4;
const KEY_GROUP_LEN = 5;

function randomGroup(len: number): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  return out;
}

/** Génère une clé lisible, ex `YRZ-7K2M9-4XQT1-PND8R-Z3WHV` (~100 bits). */
export function generateActivationKey(): string {
  const groups = Array.from({ length: KEY_GROUPS }, () => randomGroup(KEY_GROUP_LEN));
  return `${KEY_PREFIX}-${groups.join("-")}`;
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
  | "KEY_REVOKED"
  | "KEY_REACTIVATED"
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
  createdBy: string; // id admin
  userId?: string | null; // compte lié (recommandé)
  cryptoPaymentId?: string | null;
  expiresInDays?: number | null;
  note?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Crée une clé unique et la persiste. Réessaie en cas de collision (improbable). */
export async function createActivationKey(opts: GenerateKeyOptions) {
  const expiresAt =
    opts.expiresInDays && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateActivationKey();
    const keyHash = hashKey(key);
    try {
      const created = await db.activationKey.create({
        data: {
          key,
          keyHash,
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
        metadata: { cryptoPaymentId: opts.cryptoPaymentId ?? null, expiresAt },
      });

      return created;
    } catch (e: unknown) {
      // P2002 = collision sur key/keyHash (ou cryptoPaymentId déjà lié) → on
      // ne réessaie que pour une vraie collision de clé.
      const code = (e as { code?: string })?.code;
      if (code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("KEY_GENERATION_FAILED");
}

// ─── Validation d'une clé (redemption) ───────────────────────────────────────

export type RedeemResult =
  | { ok: true; keyId: string }
  | {
      ok: false;
      code: "INVALID" | "USED" | "REVOKED" | "EXPIRED" | "WRONG_ACCOUNT";
      message: string;
    };

/**
 * Valide une clé pour le compte `userId`. Usage unique garanti par une mise à
 * jour conditionnelle atomique (`updateMany where status=ACTIVE`) : deux
 * requêtes concurrentes ne peuvent pas consommer la même clé.
 */
export async function redeemActivationKey(params: {
  rawKey: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<RedeemResult> {
  const keyHash = hashKey(params.rawKey);
  const key = await db.activationKey.findUnique({ where: { keyHash } });

  if (!key) {
    await logActivation({
      action: "KEY_INVALID_ATTEMPT",
      userId: params.userId,
      success: false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { reason: "not_found" },
    });
    return { ok: false, code: "INVALID", message: "Clé invalide." };
  }

  if (key.status === "REVOKED") {
    await logActivation({
      action: "KEY_INVALID_ATTEMPT",
      keyId: key.id,
      userId: params.userId,
      success: false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { reason: "revoked" },
    });
    return { ok: false, code: "REVOKED", message: "Cette clé a été révoquée." };
  }

  if (key.status === "USED") {
    await logActivation({
      action: "KEY_INVALID_ATTEMPT",
      keyId: key.id,
      userId: params.userId,
      success: false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { reason: "already_used" },
    });
    return { ok: false, code: "USED", message: "Cette clé a déjà été utilisée." };
  }

  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    await logActivation({
      action: "KEY_INVALID_ATTEMPT",
      keyId: key.id,
      userId: params.userId,
      success: false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { reason: "expired" },
    });
    return { ok: false, code: "EXPIRED", message: "Cette clé a expiré." };
  }

  // Clé liée à un autre compte → refus (clé personnelle, non transférable).
  if (key.userId && key.userId !== params.userId) {
    await logActivation({
      action: "KEY_INVALID_ATTEMPT",
      keyId: key.id,
      userId: params.userId,
      success: false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { reason: "wrong_account" },
    });
    return {
      ok: false,
      code: "WRONG_ACCOUNT",
      message: "Cette clé est liée à un autre compte.",
    };
  }

  // Consommation atomique : seule la transaction qui fait passer ACTIVE→USED
  // gagne. Bind du compte si la clé était générique.
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
    // Course perdue : une autre requête a consommé la clé entre-temps.
    await logActivation({
      action: "KEY_INVALID_ATTEMPT",
      keyId: key.id,
      userId: params.userId,
      success: false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { reason: "race_already_used" },
    });
    return { ok: false, code: "USED", message: "Cette clé a déjà été utilisée." };
  }

  // Débloque l'accès. Trace dans le journal métier (AuditLog) + journal clés.
  await db.user.update({
    where: { id: params.userId },
    data: { accessStatus: "ACTIVE" },
  });

  await Promise.all([
    db.auditLog.create({
      data: {
        userId: params.userId,
        action: "ACCESS_ACTIVATED",
        target: key.id,
        metadata: { source: "activation_key" },
      },
    }),
    logActivation({
      action: "KEY_REDEEMED",
      keyId: key.id,
      userId: params.userId,
      success: true,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }),
  ]);

  return { ok: true, keyId: key.id };
}
