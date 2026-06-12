import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// État d'avancement de l'onboarding, dérivé des données existantes
// (aucun champ dédié : chaque étape est recalculée à la volée).
export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const [user, bankCount, paymentCount, link] = await Promise.all([
      db.user.findUnique({ where: { id: s.userId }, select: { emailVerified: true } }),
      db.bankAccount.count({ where: { userId: s.userId } }),
      db.transaction.count({ where: { userId: s.userId, type: "PAYIN", status: "SUCCEEDED" } }),
      db.paymentLink.findFirst({ where: { userId: s.userId }, select: { slug: true } }),
    ]);
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    return NextResponse.json({
      emailVerified: user.emailVerified,
      hasBankAccount: bankCount > 0,
      hasReceivedPayment: paymentCount > 0,
      linkSlug: link?.slug ?? null,
    });
  } catch (e) {
    console.error("ONBOARDING_GET:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
