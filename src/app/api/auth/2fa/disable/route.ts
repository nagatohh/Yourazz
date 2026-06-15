import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { verifyTotpCode, consumeBackupCode } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ code: z.string().min(6).max(12) });

// Désactivation : exige un code TOTP valide ou un code de secours.
export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { allowed } = await rateLimit(`2fa-disable:${s.userId}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });

    const { code } = schema.parse(await req.json());

    const user = await db.user.findUnique({
      where: { id: s.userId },
      select: { totpSecret: true, totpEnabled: true, totpBackupCodes: true },
    });
    if (!user?.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "Le 2FA n'est pas activé" }, { status: 400 });
    }

    const totpValid = verifyTotpCode(decrypt(user.totpSecret), code);
    const backupValid =
      !totpValid && Array.isArray(user.totpBackupCodes)
        ? consumeBackupCode(user.totpBackupCodes as string[], code) !== null
        : false;

    if (!totpValid && !backupValid) {
      await db.securityLog.create({
        data: { userId: s.userId, action: "2FA_DISABLE_FAILED", severity: "WARNING" },
      });
      return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
    }

    await db.user.update({
      where: { id: s.userId },
      data: { totpEnabled: false, totpSecret: null, totpBackupCodes: Prisma.DbNull },
    });

    await db.securityLog.create({
      data: { userId: s.userId, action: "2FA_DISABLED", severity: "WARNING" },
    });

    return NextResponse.json({ disabled: true });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    console.error("2FA_DISABLE:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
