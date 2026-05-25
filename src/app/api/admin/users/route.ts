import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const s = await getAdminSession();
    if (!s) return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        wallet: { select: { availableBalance: true, pendingBalance: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    console.error("ADMIN_USERS_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
