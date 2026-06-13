import { NextResponse } from "next/server";
import { CryptoPaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// Liste des demandes de vérification de paiement crypto pour l'admin.
// Filtre optionnel ?status=PENDING|RECEIVED|REJECTED.
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where =
    status === "PENDING" || status === "RECEIVED" || status === "REJECTED"
      ? { status: status as CryptoPaymentStatus }
      : {};

  const payments = await db.cryptoPayment.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      plan: true,
      reference: true,
      currency: true,
      address: true,
      txid: true,
      amount: true,
      status: true,
      note: true,
      reviewedAt: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true } },
      activationKey: { select: { id: true, key: true, status: true, plan: true } },
    },
  });

  const counts = await db.cryptoPayment.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const pending = counts.find((c) => c.status === "PENDING")?._count._all ?? 0;

  return NextResponse.json({ payments, pendingCount: pending });
}
