import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { generateTotpSecret, buildOtpauthUrl } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Étape 1 de l'enrôlement : génère un secret TOTP (stocké chiffré,
 * 2FA pas encore actif) et renvoie le QR code à scanner.
 */
export async function POST() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { allowed } = rateLimit(`2fa-setup:${s.userId}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    const user = await db.user.findUnique({
      where: { id: s.userId },
      select: { email: true, totpEnabled: true },
    });
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (user.totpEnabled) {
      return NextResponse.json({ error: "Le 2FA est déjà activé" }, { status: 400 });
    }

    const secret = generateTotpSecret();
    await db.user.update({
      where: { id: s.userId },
      data: { totpSecret: encrypt(secret), totpEnabled: false },
    });

    const otpauthUrl = buildOtpauthUrl(secret, user.email);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });

    return NextResponse.json({ secret, otpauthUrl, qrDataUrl });
  } catch (e) {
    console.error("2FA_SETUP:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
