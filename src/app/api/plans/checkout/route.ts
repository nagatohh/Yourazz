import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createPlanCheckout } from "@/lib/services/plans";
import { z } from "zod";

const schema = z.object({ plan: z.enum(["PRO", "BUSINESS"]) });

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { allowed } = await rateLimit(`plan-checkout:${s.userId}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    const { plan } = schema.parse(await req.json());
    const result = await createPlanCheckout(s.userId, plan);

    return NextResponse.json(result);
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    const msg = e?.message || String(e);
    console.error("PLAN_CHECKOUT:", msg, e?.stack);
    return NextResponse.json({ error: "Impossible de créer la session de paiement", detail: msg }, { status: 500 });
  }
}
