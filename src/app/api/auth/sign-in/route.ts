import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { signInSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`login:${ip}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives, réessayez dans 1 minute" }, { status: 429 });

    const { email, password } = signInSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      await db.securityLog.create({
        data: { action: "LOGIN_FAILED", ipAddress: ip, metadata: { email } },
      });
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    if (user.status !== "ACTIVE")
      return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });

    await createSession(user.id, user.role);
    await db.securityLog.create({
      data: { userId: user.id, action: "LOGIN_SUCCESS", ipAddress: ip },
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified },
    });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    return NextResponse.json({ error: "Erreur de connexion" }, { status: 500 });
  }
}
