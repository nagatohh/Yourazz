import { NextResponse } from "next/server";
import { getAccessPrice } from "@/lib/services/access";

export const dynamic = "force-dynamic";

// Cache module : le prix ne change presque jamais, inutile d'appeler
// Stripe à chaque affichage de la page de paiement.
let cached: { amount: number; currency: string; interval: string } | null = null;
let cachedAt = 0;
const TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    if (!cached || Date.now() - cachedAt > TTL) {
      cached = await getAccessPrice();
      cachedAt = Date.now();
    }
    return NextResponse.json(cached);
  } catch (e: any) {
    console.error("ACCESS_PRICE_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
