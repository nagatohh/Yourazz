import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

interface StatsResult {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  totalPayouts: number;
  pendingPayouts: number;
  failedTransactions: number;
  todayVolume: number;
  weekVolume: number;
}

export async function GET() {
  try {
    const s = await getAdminSession();
    if (!s) return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

    const cached = getCached<StatsResult>("admin:stats");
    if (cached) return NextResponse.json(cached);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);

    const [counts, volumeAgg, todayAgg, weekAgg] = await Promise.all([
      db.$queryRaw<[{ users: bigint; transactions: bigint; payouts: bigint; pending_payouts: bigint; failed_tx: bigint }]>`
        SELECT
          (SELECT COUNT(*) FROM "User") as users,
          (SELECT COUNT(*) FROM "Transaction") as transactions,
          (SELECT COUNT(*) FROM "Payout") as payouts,
          (SELECT COUNT(*) FROM "Payout" WHERE status IN ('PENDING', 'PROCESSING')) as pending_payouts,
          (SELECT COUNT(*) FROM "Transaction" WHERE status = 'FAILED') as failed_tx
      `,
      db.transaction.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED" } }),
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCEEDED", createdAt: { gte: startOfDay } },
      }),
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCEEDED", createdAt: { gte: startOfWeek } },
      }),
    ]);

    const c = counts[0];
    const result: StatsResult = {
      totalUsers: Number(c.users),
      totalTransactions: Number(c.transactions),
      totalVolume: volumeAgg._sum.amount || 0,
      totalPayouts: Number(c.payouts),
      pendingPayouts: Number(c.pending_payouts),
      failedTransactions: Number(c.failed_tx),
      todayVolume: todayAgg._sum.amount || 0,
      weekVolume: weekAgg._sum.amount || 0,
    };

    setCache("admin:stats", result, 30_000);

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("ADMIN_STATS_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
