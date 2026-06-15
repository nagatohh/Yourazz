import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createAccessCheckout } from "@/lib/services/access";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = await rateLimit(`access-checkout:${s.userId}:${ip}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });

    const user = await db.user.findUnique({
      where: { id: s.userId },
      select: { accessStatus: true, status: true },
    });
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (user.status !== "ACTIVE") return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
    if (user.accessStatus === "ACTIVE") {
      return NextResponse.json({ error: "Votre accès est déjà actif" }, { status: 400 });
    }

    const { url } = await createAccessCheckout(s.userId);

    await db.auditLog.create({
      data: { userId: s.userId, action: "ACCESS_CHECKOUT_CREATED" },
    });

    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("ACCESS_CHECKOUT_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur lors de la création du paiement" }, { status: 500 });
  }
}
