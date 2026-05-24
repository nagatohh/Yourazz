import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const transactions = await db.transaction.findMany({
    where: { userId: s.userId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const header = "Date,Type,Montant,Méthode,Statut,Payeur,Description\n";
  const rows = transactions.map((tx) => {
    const date = new Date(tx.createdAt).toISOString();
    const amount = (tx.amount / 100).toFixed(2);
    const method = tx.paymentMethod || "";
    const status = tx.status;
    const payer = (tx.payerName || tx.payerEmail || "").replace(/,/g, " ");
    const desc = (tx.description || "").replace(/,/g, " ");
    return `${date},${tx.type},${amount},${method},${status},${payer},${desc}`;
  }).join("\n");

  const csv = header + rows;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
