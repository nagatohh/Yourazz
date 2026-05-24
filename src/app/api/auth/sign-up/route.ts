import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { signUpSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`signup:${ip}`, 3, 300000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives, réessayez dans 5 minutes" }, { status: 429 });

    const body = await req.json();
    const { email, password, name } = signUpSchema.parse(body);

    if (await db.user.findUnique({ where: { email } }))
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

    const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password), name } });
    await db.wallet.create({ data: { userId: user.id } });

    const slug = (name || "pay").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20) + "-" + user.id.slice(-4);
    await db.paymentLink.create({ data: { userId: user.id, slug, label: `Payer ${name || ""}`.trim() } });

    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email, name } });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Données invalides" }, { status: 400 });
    console.error("SIGN-UP ERROR:", e);
    return NextResponse.json({ error: e?.message || "Erreur lors de l'inscription" }, { status: 500 });
  }
}
