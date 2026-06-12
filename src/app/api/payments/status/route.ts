import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const { allowed } = rateLimit(`payment-status:${ip}`, 30, 60000);
  if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

  const url = new URL(req.url);
  const txId = url.searchParams.get("id");

  if (!txId || txId.length > 64) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    select: { id: true, status: true, amount: true },
  });

  if (!tx) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });

  return NextResponse.json({ status: tx.status, amount: tx.amount });
}
