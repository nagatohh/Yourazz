import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`register-invite:${ip}`, 5, 300000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });

    const body = await req.json();
    const { token, email, password, name } = schema.parse(body);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await db.invitation.findUnique({ where: { tokenHash } });
    if (!invitation) return NextResponse.json({ error: "Invitation invalide" }, { status: 400 });
    if (invitation.usedAt) return NextResponse.json({ error: "Invitation déjà utilisée" }, { status: 400 });
    if (invitation.expiresAt < new Date()) return NextResponse.json({ error: "Invitation expirée" }, { status: 400 });
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "L'email ne correspond pas à l'invitation" }, { status: 400 });
    }

    if (await db.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
    }

    const user = await db.$transaction(async (prisma) => {
      const u = await prisma.user.create({
        data: { email, passwordHash: await hashPassword(password), name, role: invitation.role, emailVerified: false },
      });
      await prisma.wallet.create({ data: { userId: u.id } });
      const slug = (name || "pay").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20) + "-" + u.id.slice(-4);
      await prisma.paymentLink.create({ data: { userId: u.id, slug, label: `Payer ${name}`.trim() } });
      await prisma.invitation.update({ where: { id: invitation.id }, data: { usedAt: new Date() } });
      return u;
    });

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyHash = crypto.createHash("sha256").update(verifyToken).digest("hex");
    await db.emailVerification.create({
      data: { userId: user.id, tokenHash: verifyHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    await sendVerificationEmail(email, verifyToken, name);

    await db.auditLog.create({
      data: { userId: user.id, action: "USER_REGISTERED_VIA_INVITE", target: invitation.id, metadata: { email, role: invitation.role } },
    });

    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email, name }, needsVerification: true });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("REGISTER_INVITE_ERROR:", e);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
