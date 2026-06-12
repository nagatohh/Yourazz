import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

function sanitizeCsvField(value: string): string {
  const cleaned = value.replace(/,/g, " ").replace(/[\r\n]+/g, " ");
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    return "'" + cleaned;
  }
  return cleaned;
}

export async function GET(req: Request) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "transactions";
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  if (type === "transactions") {
    const where: any = {};
    if (status) where.status = status;
    if (from || to) where.createdAt = dateFilter;

    const transactions = await db.transaction.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const header = "ID,Date,Utilisateur,Email,Type,Statut,Montant,Frais,Net,Méthode,Provider\n";
    const rows = transactions.map((t) =>
      [
        t.id,
        t.createdAt.toISOString(),
        sanitizeCsvField(t.user.name || ""),
        sanitizeCsvField(t.user.email),
        t.type,
        t.status,
        (t.amount / 100).toFixed(2),
        (t.fees / 100).toFixed(2),
        (t.netAmount / 100).toFixed(2),
        t.paymentMethod || "",
        t.provider || "",
      ].join(",")
    ).join("\n");

    return new Response(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === "payouts") {
    const where: any = {};
    if (status) where.status = status;
    if (from || to) where.createdAt = dateFilter;

    const payouts = await db.payout.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        bankAccount: { select: { ibanMasked: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const header = "ID,Date,Utilisateur,Email,Montant,Frais,Statut,IBAN\n";
    const rows = payouts.map((p) =>
      [
        p.id,
        p.createdAt.toISOString(),
        sanitizeCsvField(p.user.name || ""),
        sanitizeCsvField(p.user.email),
        (p.amount / 100).toFixed(2),
        (p.fees / 100).toFixed(2),
        p.status,
        p.bankAccount.ibanMasked,
      ].join(",")
    ).join("\n");

    return new Response(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payouts_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Type invalide" }, { status: 400 });
}
