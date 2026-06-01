import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConnectedBalance } from "@/lib/services/stripe-connect";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: s.userId },
      include: { wallet: true },
    });

    let stripeBalance = { available: 0, pending: 0 };

    if (user?.stripeAccountId) {
      try {
        stripeBalance = await getConnectedBalance(user.stripeAccountId);
      } catch {
        // Stripe balance unavailable, fallback to local wallet
      }
    }

    const wallet = user?.wallet;

    return NextResponse.json({
      availableBalance: stripeBalance.available || wallet?.availableBalance || 0,
      pendingBalance: stripeBalance.pending || wallet?.pendingBalance || 0,
      currency: "EUR",
      stripeConnected: !!user?.stripeAccountId,
      payoutsEnabled: user?.payoutsEnabled || false,
    });
  } catch (e: any) {
    console.error("WALLET_GET:", e?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
