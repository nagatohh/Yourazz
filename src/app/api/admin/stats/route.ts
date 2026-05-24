import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export async function GET() {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [totalUsers, totalTransactions, totalPayouts, volumeAgg] = await Promise.all([
    db.user.count(),
    db.transaction.count(),
    db.payout.count(),
    db.transaction.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED" } }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalTransactions,
    totalVolume: volumeAgg._sum.amount || 0,
    totalPayouts,
  });
}
