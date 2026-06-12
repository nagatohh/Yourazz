import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { verifyTotpCode, generateBackupCodes } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ code: z.string().min(6).max(8) });

/**
 * Étape 2 de l'enrôlement : vérifie le premier code généré par
 * l'application, active le 2FA et renvoie les codes de secours
 * (affichés une seule fois — seuls les hashes sont stockés).
 */
export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { allowed } = rateLimit(`2fa-enable:${s.userId}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });

    const { code } = schema.parse(await req.json());

    const user = await db.user.findUnique({
      where: { id: s.userId },
      select: { totpSecret: true, totpEnabled: true },
    });
    if (!user?.totpSecret) {
      return NextResponse.json({ error: "Aucune configuration 2FA en cours" }, { status: 400 });
    }
    if (user.totpEnabled) {
      return NextResponse.json({ error: "Le 2FA est déjà activé" }, { status: 400 });
    }

    if (!verifyTotpCode(decrypt(user.totpSecret), code)) {
      return NextResponse.json({ error: "Code incorrect, réessayez" }, { status: 400 });
    }

    const { plain, hashes } = generateBackupCodes();
    await db.user.update({
      where: { id: s.userId },
      data: { totpEnabled: true, totpBackupCodes: hashes },
    });

    await db.securityLog.create({
      data: { userId: s.userId, action: "2FA_ENABLED", severity: "INFO" },
    });

    return NextResponse.json({ enabled: true, backupCodes: plain });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    console.error("2FA_ENABLE:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
