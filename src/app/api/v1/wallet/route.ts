import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const wallet = await db.wallet.findUnique({
    where: { userId: auth.userId },
    select: { availableBalance: true, pendingBalance: true, currency: true, status: true },
  });

  if (!wallet) return NextResponse.json({ error: "No wallet found" }, { status: 404 });

  return NextResponse.json({
    available: wallet.availableBalance,
    pending: wallet.pendingBalance,
    currency: wallet.currency,
    status: wallet.status,
  });
}
