import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [stripePayments, cryptoPayments] = await Promise.all([
    db.accessPayment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, amount: true, currency: true, status: true, createdAt: true },
    }),
    db.cryptoPayment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, plan: true, amount: true, currency: true, status: true, reference: true, createdAt: true },
    }),
  ]);

  const history = [
    ...stripePayments.map((p) => ({
      id: p.id,
      type: "stripe" as const,
      amount: `${(p.amount / 100).toFixed(2)} ${p.currency.toUpperCase()}`,
      status: p.status,
      plan: null as string | null,
      reference: null as string | null,
      date: p.createdAt,
    })),
    ...cryptoPayments.map((p) => ({
      id: p.id,
      type: "crypto" as const,
      amount: p.amount ? `${p.amount} ${p.currency}` : `— ${p.currency}`,
      status: p.status,
      plan: p.plan,
      reference: p.reference,
      date: p.createdAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ history });
}
