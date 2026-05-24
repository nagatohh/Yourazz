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

export function rateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
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

export function rateLimitByAccount(email: string, maxAttempts: number, lockoutMs: number): { locked: boolean } {
  const key = `lockout:${email.toLowerCase()}`;
  const now = Date.now();
  const timestamps = (rateMap.get(key) || []).filter((t) => now - t < lockoutMs);

  if (timestamps.length >= maxAttempts) {
    rateMap.set(key, timestamps);
    return { locked: true };
  }

  return { locked: false };
}

export function recordFailedAttempt(email: string, lockoutMs: number) {
  const key = `lockout:${email.toLowerCase()}`;
  const now = Date.now();
  const timestamps = (rateMap.get(key) || []).filter((t) => now - t < lockoutMs);
  timestamps.push(now);
  rateMap.set(key, timestamps);
}

export function clearFailedAttempts(email: string) {
  rateMap.delete(`lockout:${email.toLowerCase()}`);
}
