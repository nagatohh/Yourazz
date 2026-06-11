import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConnectedBalance } from "@/lib/services/stripe-connect";
import { getCached, setCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Mode léger (?light=1) : pas d'appel à l'API Stripe — utilisé par le
    // dashboard qui n'a besoin que des statuts, pas du solde Stripe temps réel.
    const light = new URL(req.url).searchParams.get("light") === "1";

    const user = await db.user.findUnique({
      where: { id: s.userId },
      include: { wallet: true },
    });

    let stripeBalance = { available: 0, pending: 0 };

    if (!light && user?.stripeAccountId) {
      const cacheKey = `stripe-balance:${user.stripeAccountId}`;
      const cached = getCached<typeof stripeBalance>(cacheKey);
      if (cached) {
        stripeBalance = cached;
      } else {
        try {
          stripeBalance = await getConnectedBalance(user.stripeAccountId);
          setCache(cacheKey, stripeBalance, 30_000);
        } catch {
          // Stripe balance unavailable, fallback to local wallet
        }
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
