import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalEvidences,
    riskBreakdown,
    disputes,
    recentAlerts,
    recentHighRisk,
  ] = await Promise.all([
    db.paymentEvidence.count({ where: { createdAt: { gte: since } } }),
    db.paymentRisk.groupBy({
      by: ["level"],
      _count: true,
      where: { createdAt: { gte: since } },
    }),
    db.stripeDispute.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { evidence: { select: { payerEmail: true, amount: true } } },
    }),
    db.adminAlert.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.paymentRisk.findMany({
      where: { createdAt: { gte: since }, level: { in: ["HIGH", "CRITICAL"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        evidence: {
          select: {
            id: true,
            payerEmail: true,
            payerName: true,
            amount: true,
            paymentStatus: true,
            stripePaymentIntentId: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const riskMap: Record<string, number> = Object.fromEntries(
    riskBreakdown.map((r: { level: string; _count: number }) => [r.level, r._count])
  );

  return NextResponse.json({
    stats: {
      totalEvidences,
      riskLow: riskMap.LOW || 0,
      riskMedium: riskMap.MEDIUM || 0,
      riskHigh: riskMap.HIGH || 0,
      riskCritical: riskMap.CRITICAL || 0,
      totalDisputes: disputes.length,
    },
    disputes,
    alerts: recentAlerts,
    highRiskPayments: recentHighRisk,
  });
}
