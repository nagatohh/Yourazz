import { NextResponse } from "next/server";

// Désactivé : cette route reposait sur un fournisseur de démonstration qui
// déclarait tout paiement « réussi » sans encaissement réel. Les paiements
// passent uniquement par /api/payments/create-intent (webhook signé du prestataire).
function gone() {
  return NextResponse.json({ error: "Route désactivée" }, { status: 410 });
}

export const GET = gone;
export const POST = gone;
