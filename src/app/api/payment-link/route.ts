import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const link = await db.paymentLink.findFirst({ where: { userId: s.userId } });
  return NextResponse.json({ link });
}
