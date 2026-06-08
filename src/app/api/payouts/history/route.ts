import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const payouts = await db.payout.findMany({ where: { userId: s.userId }, include: { bankAccount: true }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ payouts });
}
