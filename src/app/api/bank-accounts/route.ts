import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const accounts = await db.bankAccount.findMany({
    where: { userId: s.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ibanMasked: true,
      holderName: true,
      bankName: true,
      country: true,
      currency: true,
      status: true,
      isDefault: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ accounts });
}

/**
 * Déprécié : l'ajout d'IBAN se fait désormais via l'onboarding Stripe Express
 * (POST /api/stripe/connect/onboard → page hébergée). Yourazz ne saisit plus
 * les coordonnées bancaires en interne.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "L'ajout manuel d'IBAN est désactivé. Connectez votre compte via Stripe depuis la page Compte bancaire.",
      redirect: "/dashboard/bank-account",
    },
    { status: 410 },
  );
}
