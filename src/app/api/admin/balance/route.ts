import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getAdminSession();
    if (!s) return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

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
  } catch (e: any) {
    console.error("ADMIN_BALANCE_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
