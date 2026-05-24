import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const wallet = await db.wallet.findUnique({ where: { userId: s.userId } });
  const transactions = await db.transaction.findMany({ where: { userId: s.userId }, orderBy: { createdAt: "desc" }, take: 20 });

  return NextResponse.json({ wallet, transactions });
}
