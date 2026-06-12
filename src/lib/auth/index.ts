import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const COOKIE = "session";
const DURATION = 60 * 60 * 24 * 7;

function key() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return new TextEncoder().encode(s);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function createSession(userId: string, role?: string) {
  const token = await new SignJWT({ userId, role: role || "USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURATION}s`)
    .sign(key());

  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DURATION,
    path: "/",
  });
  return token;
}

export async function getSession(): Promise<{ userId: string; role: string } | null> {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return {
      userId: payload.userId as string,
      role: (payload.role as string) || "USER",
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const c = await cookies();
  c.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// ─── 2FA : session intermédiaire ─────────────────────────────────────────────
// Entre "mot de passe validé" et "code TOTP validé", l'utilisateur porte un
// JWT court (5 min) marqué pending2fa — il ne donne accès à AUCUNE route
// protégée (getSession l'ignore, le claim est différent).

const PENDING_2FA_COOKIE = "2fa_pending";
const PENDING_2FA_DURATION = 60 * 5;

export async function createPending2fa(userId: string, role: string) {
  const token = await new SignJWT({ userId, role: role || "USER", pending2fa: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_2FA_DURATION}s`)
    .sign(key());

  const c = await cookies();
  c.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_2FA_DURATION,
    path: "/",
  });
}

export async function getPending2fa(): Promise<{ userId: string; role: string } | null> {
  const c = await cookies();
  const t = c.get(PENDING_2FA_COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    if (payload.pending2fa !== true) return null;
    return {
      userId: payload.userId as string,
      role: (payload.role as string) || "USER",
    };
  } catch {
    return null;
  }
}

export async function clearPending2fa() {
  const c = await cookies();
  c.set(PENDING_2FA_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
