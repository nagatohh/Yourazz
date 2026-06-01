import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;

    const account = await db.bankAccount.findFirst({ where: { id, userId: s.userId } });
    if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    const hasPendingPayouts = await db.payout.count({
      where: { bankAccountId: id, status: { in: ["PENDING", "PROCESSING"] } },
    });
    if (hasPendingPayouts > 0) {
      return NextResponse.json({ error: "Impossible de supprimer : retrait en cours" }, { status: 400 });
    }

    await db.bankAccount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("BANK_ACCOUNT_DELETE:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
