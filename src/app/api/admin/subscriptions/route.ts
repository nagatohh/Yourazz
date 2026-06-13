import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// Utilisateurs activés (vue abonnements). Par défaut : comptes ayant un plan
// payant (Pro/Business). ?all=1 inclut aussi les Starter.
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";

  const users = await db.user.findMany({
    where: all ? {} : { plan: { in: ["PRO", "BUSINESS"] } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      accessStatus: true,
      createdAt: true,
      accessSubscription: { select: { status: true, currentPeriodEnd: true } },
      _count: { select: { activationKeys: true } },
    },
  });

  const counts = await db.user.groupBy({ by: ["plan"], _count: { _all: true } });
  const byPlan = { STARTER: 0, PRO: 0, BUSINESS: 0 } as Record<string, number>;
  for (const c of counts) byPlan[c.plan] = c._count._all;

  return NextResponse.json({ users, byPlan });
}
