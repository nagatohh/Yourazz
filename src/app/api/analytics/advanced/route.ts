import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFeatureApi } from "@/lib/services/plan-guard";

export const dynamic = "force-dynamic";

/**
 * Statistiques avancées — réservées au plan Business (feature `advancedStats`).
 * Le plan est vérifié côté serveur : un Starter/Pro reçoit 403 PLAN_REQUIRED,
 * même en appelant cette route directement.
 */
export async function GET() {
  const guard = await requireFeatureApi("advancedStats");
  if (!guard.ok) return guard.response;
  const userId = guard.viewer.id;

  const now = new Date();
  const since30 = new Date(now);
  since30.setDate(now.getDate() - 30);
  const since14 = new Date(now);
  since14.setDate(now.getDate() - 13);
  since14.setHours(0, 0, 0, 0);

  const succeededWhere = {
    userId,
    type: "PAYIN" as const,
    status: "SUCCEEDED" as const,
    createdAt: { gte: since30 },
  };

  const [byMethodRaw, topPayersRaw, dayRows, agg, attempts] = await Promise.all([
    db.transaction.groupBy({
      by: ["paymentMethod"],
      where: succeededWhere,
      _sum: { amount: true },
      _count: true,
    }),
    db.transaction.groupBy({
      by: ["payerEmail"],
      where: { ...succeededWhere, payerEmail: { not: null } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    db.transaction.findMany({
      where: { userId, type: "PAYIN", status: "SUCCEEDED", createdAt: { gte: since14 } },
      select: { amount: true, createdAt: true },
    }),
    db.transaction.aggregate({
      where: succeededWhere,
      _sum: { amount: true, netAmount: true },
      _avg: { amount: true },
      _count: true,
    }),
    db.transaction.count({ where: { userId, type: "PAYIN", createdAt: { gte: since30 } } }),
  ]);

  // Revenus par jour sur 14 jours (buckets initialisés à 0)
  const days: { name: string; revenue: number }[] = [];
  const dayIndex = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const name = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    dayIndex.set(name, days.length);
    days.push({ name, revenue: 0 });
  }
  for (const row of dayRows) {
    const d = new Date(row.createdAt);
    d.setHours(0, 0, 0, 0);
    const name = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    const idx = dayIndex.get(name);
    if (idx !== undefined) days[idx].revenue += row.amount;
  }

  const succeeded = agg._count;
  const successRate = attempts > 0 ? Math.round((succeeded / attempts) * 100) : 0;

  return NextResponse.json({
    range: "30j",
    totals: {
      revenue: agg._sum.amount ?? 0,
      net: agg._sum.netAmount ?? 0,
      count: succeeded,
      avgBasket: Math.round(agg._avg.amount ?? 0),
      successRate,
    },
    byMethod: byMethodRaw
      .map((m) => ({ method: m.paymentMethod ?? "CARD", amount: m._sum.amount ?? 0, count: m._count }))
      .sort((a, b) => b.amount - a.amount),
    byDay: days,
    topPayers: topPayersRaw.map((p) => ({ email: p.payerEmail, amount: p._sum.amount ?? 0, count: p._count })),
  });
}
