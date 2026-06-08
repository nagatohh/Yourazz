import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const txId = url.searchParams.get("id");

  if (!txId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    select: { id: true, status: true, amount: true, createdAt: true },
  });

  if (!tx) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });

  return NextResponse.json({ status: tx.status, amount: tx.amount });
}
