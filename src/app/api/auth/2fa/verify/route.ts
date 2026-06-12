import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, getPending2fa, clearPending2fa } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { verifyTotpCode, consumeBackupCode } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ code: z.string().min(6).max(12) });

/**
 * Deuxième étape du login : le mot de passe a été validé (cookie pending2fa,
 * 5 min), on vérifie le code TOTP ou un code de secours avant de créer la
 * vraie session.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`2fa-verify:${ip}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });

    const pending = await getPending2fa();
    if (!pending) {
      return NextResponse.json({ error: "Session expirée, reconnectez-vous" }, { status: 401 });
    }

    const { code } = schema.parse(await req.json());

    const user = await db.user.findUnique({
      where: { id: pending.userId },
      select: {
        id: true, email: true, name: true, role: true, status: true,
        emailVerified: true, totpSecret: true, totpEnabled: true, totpBackupCodes: true,
      },
    });
    if (!user || user.status !== "ACTIVE" || !user.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    let valid = verifyTotpCode(decrypt(user.totpSecret), code);

    // Code de secours à usage unique : consommé puis retiré de la liste
    if (!valid && Array.isArray(user.totpBackupCodes)) {
      const remaining = consumeBackupCode(user.totpBackupCodes as string[], code);
      if (remaining !== null) {
        valid = true;
        await db.user.update({ where: { id: user.id }, data: { totpBackupCodes: remaining } });
        await db.securityLog.create({
          data: { userId: user.id, action: "2FA_BACKUP_CODE_USED", ipAddress: ip, severity: "WARNING" },
        });
      }
    }

    if (!valid) {
      await db.securityLog.create({
        data: { userId: user.id, action: "2FA_VERIFY_FAILED", ipAddress: ip, severity: "WARNING" },
      });
      return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
    }

    await clearPending2fa();
    await createSession(user.id, user.role);
    await db.securityLog.create({
      data: { userId: user.id, action: "LOGIN_SUCCESS_2FA", ipAddress: ip },
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified },
    });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    console.error("2FA_VERIFY:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
