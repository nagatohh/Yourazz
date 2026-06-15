import { Redis } from "@upstash/redis";

/**
 * Rate limiting & verrouillage de compte.
 *
 * Backend : Upstash Redis (REST) quand `UPSTASH_REDIS_REST_URL` +
 * `UPSTASH_REDIS_REST_TOKEN` sont définis — indispensable sur Vercel serverless
 * où chaque instance a sa propre mémoire (un Map local ne partage rien et se
 * réinitialise à froid, donc contournable). Sinon, repli sur un compteur
 * en mémoire (dev local / Upstash non configuré) : le comportement reste
 * identique à l'ancien, sans dépendance externe.
 *
 * Compteur à fenêtre fixe : `INCR` atomique + `PEXPIRE` à la première occurrence.
 * Atomique côté Redis → pas de race entre instances concurrentes.
 *
 * API volontairement async : tous les points d'appel `await` le résultat.
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ─── Repli en mémoire ─────────────────────────────────────────────────────────
const rateMap = new Map<string, number[]>();
const MAX_MAP_SIZE = 10000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  for (const [key, timestamps] of rateMap) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) rateMap.delete(key);
    else rateMap.set(key, valid);
  }
  if (rateMap.size > MAX_MAP_SIZE) rateMap.clear();
}

function memRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanup(windowMs);
  const timestamps = (rateMap.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    rateMap.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }
  timestamps.push(now);
  rateMap.set(key, timestamps);
  return { allowed: true, remaining: maxRequests - timestamps.length };
}

// ─── Redis : compteur à fenêtre fixe ─────────────────────────────────────────
async function redisIncrWindow(key: string, windowMs: number): Promise<number> {
  const k = `rl:${key}`;
  const count = await redis!.incr(k);
  if (count === 1) await redis!.pexpire(k, windowMs);
  return count;
}

/**
 * Limite générique. `allowed=false` une fois `maxRequests` atteint dans la
 * fenêtre. En cas d'erreur Redis transitoire on laisse passer (fail-open) :
 * un incident d'infra ne doit pas bloquer les paiements/connexions légitimes.
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) return memRateLimit(key, maxRequests, windowMs);
  try {
    const count = await redisIncrWindow(key, windowMs);
    return { allowed: count <= maxRequests, remaining: Math.max(0, maxRequests - count) };
  } catch (e) {
    console.error("RATE_LIMIT_REDIS_ERROR:", (e as Error)?.message || e);
    return { allowed: true, remaining: maxRequests };
  }
}

// ─── Verrouillage de compte (login) ──────────────────────────────────────────
// Clé partagée entre les 3 fonctions : recordFailedAttempt incrémente,
// rateLimitByAccount lit, clearFailedAttempts remet à zéro à la connexion réussie.

function lockoutKey(email: string): string {
  return `lockout:${email.toLowerCase()}`;
}

export async function rateLimitByAccount(
  email: string,
  maxAttempts: number,
  lockoutMs: number,
): Promise<{ locked: boolean }> {
  const key = lockoutKey(email);
  if (!redis) {
    const now = Date.now();
    const timestamps = (rateMap.get(key) || []).filter((t) => now - t < lockoutMs);
    return { locked: timestamps.length >= maxAttempts };
  }
  try {
    const count = (await redis.get<number>(`rl:${key}`)) ?? 0;
    return { locked: count >= maxAttempts };
  } catch (e) {
    console.error("RATE_LIMIT_REDIS_ERROR:", (e as Error)?.message || e);
    return { locked: false };
  }
}

export async function recordFailedAttempt(email: string, lockoutMs: number): Promise<void> {
  const key = lockoutKey(email);
  if (!redis) {
    const now = Date.now();
    const timestamps = (rateMap.get(key) || []).filter((t) => now - t < lockoutMs);
    timestamps.push(now);
    rateMap.set(key, timestamps);
    return;
  }
  try {
    await redisIncrWindow(key, lockoutMs);
  } catch (e) {
    console.error("RATE_LIMIT_REDIS_ERROR:", (e as Error)?.message || e);
  }
}

export async function clearFailedAttempts(email: string): Promise<void> {
  const key = lockoutKey(email);
  if (!redis) {
    rateMap.delete(key);
    return;
  }
  try {
    await redis.del(`rl:${key}`);
  } catch (e) {
    console.error("RATE_LIMIT_REDIS_ERROR:", (e as Error)?.message || e);
  }
}
