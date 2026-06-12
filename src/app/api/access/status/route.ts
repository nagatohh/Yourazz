import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: s.userId },
      select: {
        accessStatus: true,
        role: true,
        accessSubscription: {
          select: { status: true, currentPeriodEnd: true },
        },
      },
    });
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const isAdmin = user.role === "ADMIN" || user.role === "ADMIN_OWNER";

    return NextResponse.json({
      accessStatus: isAdmin ? "ACTIVE" : user.accessStatus,
      isAdmin,
      subscription: user.accessSubscription
        ? {
            status: user.accessSubscription.status,
            currentPeriodEnd: user.accessSubscription.currentPeriodEnd,
          }
        : null,
    });
  } catch (e: any) {
    console.error("ACCESS_STATUS_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
