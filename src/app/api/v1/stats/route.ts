import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [wallet, todayAgg, monthAgg, totalCount, succeededCount] = await Promise.all([
    db.wallet.findUnique({ where: { userId: auth.userId }, select: { availableBalance: true, pendingBalance: true } }),
    db.transaction.aggregate({
      where: { userId: auth.userId, type: "PAYIN", status: "SUCCEEDED", createdAt: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { userId: auth.userId, type: "PAYIN", status: "SUCCEEDED", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.transaction.count({ where: { userId: auth.userId, type: "PAYIN" } }),
    db.transaction.count({ where: { userId: auth.userId, type: "PAYIN", status: "SUCCEEDED" } }),
  ]);

  return NextResponse.json({
    balance: {
      available: wallet?.availableBalance || 0,
      pending: wallet?.pendingBalance || 0,
      currency: "EUR",
    },
    revenue: {
      today: todayAgg._sum.amount || 0,
      month: monthAgg._sum.amount || 0,
    },
    payments: {
      total: totalCount,
      succeeded: succeededCount,
      successRate: totalCount > 0 ? Math.round((succeededCount / totalCount) * 100) : 0,
    },
  });
}
