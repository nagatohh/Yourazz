import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const type = searchParams.get("type") || undefined;

  const transactions = await db.transaction.findMany({
    where: {
      userId: s.userId,
      ...(status && { status: status as any }),
      ...(type && { type: type as any }),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ transactions });
}
