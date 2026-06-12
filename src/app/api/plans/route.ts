import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, getMonthlyVolumeEur } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const [user, used] = await Promise.all([
      db.user.findUnique({
        where: { id: s.userId },
        select: { plan: true, role: true, accessSubscription: { select: { status: true, currentPeriodEnd: true, canceledAt: true } } },
      }),
      getMonthlyVolumeEur(s.userId),
    ]);
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const isAdmin = user.role === "ADMIN" || user.role === "ADMIN_OWNER";

    return NextResponse.json({
      plan: user.plan,
      isAdmin,
      monthlyUsed: used,
      monthlyCap: isAdmin ? null : PLANS[user.plan].monthlyCap,
      subscription: user.accessSubscription,
      plans: Object.entries(PLANS).map(([tier, p]) => ({
        tier,
        name: p.name,
        price: p.price,
        monthlyCap: p.monthlyCap,
      })),
    });
  } catch (e) {
    console.error("PLANS_GET:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
