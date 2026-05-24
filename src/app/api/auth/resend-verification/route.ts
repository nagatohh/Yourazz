import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`resend-verify:${ip}`, 3, 300000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives, réessayez dans 5 minutes" }, { status: 429 });

    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, name: true, emailVerified: true } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ error: "Email déjà vérifié" }, { status: 400 });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await db.emailVerification.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    await sendVerificationEmail(user.email, token, user.name || undefined);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("RESEND_VERIFICATION_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
