import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export async function GET() {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [walletAgg, payoutsAgg, feesAgg, pendingAgg] = await Promise.all([
    db.wallet.aggregate({ _sum: { availableBalance: true } }),
    db.payout.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    db.transaction.aggregate({ _sum: { fees: true }, where: { status: "SUCCEEDED" } }),
    db.wallet.aggregate({ _sum: { pendingBalance: true } }),
  ]);

  return NextResponse.json({
    totalAvailable: walletAgg._sum.availableBalance || 0,
    totalWithdrawn: payoutsAgg._sum.amount || 0,
    totalFees: feesAgg._sum.fees || 0,
    totalPending: pendingAgg._sum.pendingBalance || 0,
  });
}
