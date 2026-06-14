import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, getMonthlyVolumeEur } from "@/lib/services/plans";
import { PLAN_META, getPlanPermissions } from "@/lib/services/permissions";
import { ltcAmountForEur } from "@/lib/services/ltc-rate";

export const dynamic = "force-dynamic";

async function ltcAmount(tier: PlanTier): Promise<string> {
  if (tier === "STARTER") return "";
  const amount = await ltcAmountForEur(PLANS[tier].price, process.env[`LTC_PRICE_${tier}`]);
  return amount || "";
}

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

    const planEntries = Object.entries(PLANS) as [PlanTier, (typeof PLANS)[PlanTier]][];
    const plansWithLtc = await Promise.all(
      planEntries.map(async ([tier, p]) => ({
        tier,
        name: p.name,
        price: p.price,
        monthlyCap: p.monthlyCap,
        accent: PLAN_META[tier].accent,
        tagline: PLAN_META[tier].tagline,
        requiresKey: PLAN_META[tier].requiresKey,
        benefits: PLAN_META[tier].benefits,
        ltcAmount: await ltcAmount(tier),
      }))
    );

    return NextResponse.json({
      plan: user.plan,
      isAdmin,
      monthlyUsed: used,
      monthlyCap: isAdmin ? null : PLANS[user.plan].monthlyCap,
      permissions: getPlanPermissions(user.plan, { isAdmin }),
      subscription: user.accessSubscription,
      plans: plansWithLtc,
    });
  } catch (e) {
    console.error("PLANS_GET:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
