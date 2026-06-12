import { createHmac, randomBytes, timingSafeEqual, createHash } from "crypto";

/**
 * TOTP RFC 6238 (SHA-1, 6 chiffres, période 30s) — compatible Google
 * Authenticator, Authy, 1Password. Implémenté sur node:crypto pour ne pas
 * ajouter de dépendance dans le chemin d'authentification.
 */

const PERIOD = 30;
const DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Vérifie un code en tolérant ±1 fenêtre de 30s (dérive d'horloge du téléphone). */
export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / PERIOD);
  for (const drift of [-1, 0, 1]) {
    const expected = hotp(secret, counter + drift);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(cleaned))) return true;
  }
  return false;
}

export function buildOtpauthUrl(secretBase32: string, accountEmail: string): string {
  const issuer = "Yourazz";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

// ─── Codes de secours ────────────────────────────────────────────────────────
// 8 codes à usage unique, affichés une seule fois ; seul le hash SHA-256 est
// stocké (User.totpBackupCodes), un code consommé est retiré de la liste.

export function generateBackupCodes(): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: 8 }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashes: plain.map(hashBackupCode) };
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/** Retourne les hashes restants si le code est valide, null sinon. */
export function consumeBackupCode(hashes: string[], code: string): string[] | null {
  const h = hashBackupCode(code);
  if (!hashes.includes(h)) return null;
  return hashes.filter((x) => x !== h);
}
