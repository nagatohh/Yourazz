import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const type = searchParams.get("type") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const transactions = await db.transaction.findMany({
    where: {
      userId: auth.userId,
      ...(status && { status: status as any }),
      ...(type && { type: type as any }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      fees: true,
      netAmount: true,
      currency: true,
      paymentMethod: true,
      description: true,
      payerEmail: true,
      payerName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ transactions, count: transactions.length, offset, limit });
}
