import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [wallet, todayTx, weekTx, monthTx, allPayins, payouts, recentTx] = await Promise.all([
    db.wallet.findUnique({ where: { userId: s.userId } }),
    db.transaction.findMany({ where: { userId: s.userId, type: "PAYIN", status: "SUCCEEDED", createdAt: { gte: startOfDay } } }),
    db.transaction.findMany({ where: { userId: s.userId, type: "PAYIN", status: "SUCCEEDED", createdAt: { gte: startOfWeek } } }),
    db.transaction.findMany({ where: { userId: s.userId, type: "PAYIN", status: "SUCCEEDED", createdAt: { gte: startOfMonth } } }),
    db.transaction.findMany({ where: { userId: s.userId, type: "PAYIN" } }),
    db.payout.findMany({ where: { userId: s.userId, status: "PAID" } }),
    db.transaction.findMany({
      where: { userId: s.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        payerName: true,
        payerEmail: true,
        createdAt: true,
      },
    }),
  ]);

  const sum = (txs: { amount: number }[]) => txs.reduce((a, t) => a + t.amount, 0);
  const succeeded = allPayins.filter((t) => t.status === "SUCCEEDED").length;

  return NextResponse.json({
    availableBalance: wallet?.availableBalance || 0,
    pendingBalance: wallet?.pendingBalance || 0,
    todayRevenue: sum(todayTx),
    weekRevenue: sum(weekTx),
    monthRevenue: sum(monthTx),
    totalWithdrawn: sum(payouts),
    totalPayments: allPayins.length,
    successRate: allPayins.length > 0 ? Math.round((succeeded / allPayins.length) * 100) : 0,
    weeklyData: buildWeeklyData(weekTx, startOfWeek),
    monthlyData: buildMonthlyData(monthTx, startOfMonth),
    recentTransactions: recentTx,
  });
}

function buildWeeklyData(txs: { amount: number; createdAt: Date }[], weekStart: Date) {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return days.map((name, i) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayTxs = txs.filter((t) => t.createdAt >= dayStart && t.createdAt < dayEnd);
    return { name, revenue: dayTxs.reduce((a, t) => a + t.amount, 0) };
  });
}

function buildMonthlyData(txs: { amount: number; createdAt: Date }[], monthStart: Date) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const weeks: { name: string; revenue: number }[] = [];

  for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
    const wStart = new Date(monthStart);
    wStart.setDate(wStart.getDate() + w * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);
    const wTxs = txs.filter((t) => t.createdAt >= wStart && t.createdAt < wEnd);
    weeks.push({
      name: `S${w + 1}`,
      revenue: wTxs.reduce((a, t) => a + t.amount, 0),
    });
  }

  return weeks;
}
