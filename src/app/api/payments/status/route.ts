import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const txId = url.searchParams.get("id");

  if (!txId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    select: { id: true, status: true, amount: true, type: true, paymentMethod: true, createdAt: true },
  });

  if (!tx) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });

  return NextResponse.json({ transaction: tx });
}
