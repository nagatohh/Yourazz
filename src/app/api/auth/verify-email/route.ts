import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`verify-email:${ip}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const verification = await db.emailVerification.findUnique({ where: { tokenHash } });

    if (!verification) return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
    if (verification.usedAt) return NextResponse.json({ error: "Lien déjà utilisé" }, { status: 400 });
    if (verification.expiresAt < new Date()) return NextResponse.json({ error: "Lien expiré" }, { status: 400 });

    await db.$transaction(async (prisma) => {
      await prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: true } });
      await prisma.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } });
    });

    await db.auditLog.create({
      data: { userId: verification.userId, action: "EMAIL_VERIFIED" },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("VERIFY_EMAIL_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
