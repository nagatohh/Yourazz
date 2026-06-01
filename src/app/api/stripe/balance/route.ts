import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConnectedBalance } from "@/lib/services/stripe-connect";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: s.userId } });
    if (!user?.stripeAccountId) {
      return NextResponse.json({ available: 0, pending: 0, currency: "eur" });
    }

    const balance = await getConnectedBalance(user.stripeAccountId);

    return NextResponse.json(balance);
  } catch (e: any) {
    console.error("STRIPE_BALANCE:", e?.message);
    return NextResponse.json({ error: "Erreur récupération balance" }, { status: 500 });
  }
}
