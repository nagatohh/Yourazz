import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createBillingPortal } from "@/lib/services/plans";

export async function POST() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { allowed } = rateLimit(`plan-portal:${s.userId}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    const { url } = await createBillingPortal(s.userId);
    return NextResponse.json({ url });
  } catch (e: any) {
    if (e?.message === "NO_STRIPE_CUSTOMER") {
      return NextResponse.json({ error: "Aucun abonnement actif" }, { status: 400 });
    }
    console.error("PLAN_PORTAL:", e?.message || e);
    return NextResponse.json({ error: "Impossible d'ouvrir le portail de facturation" }, { status: 500 });
  }
}
