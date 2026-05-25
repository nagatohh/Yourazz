import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(req: Request) {
  try {
    const s = await getAdminSession();
    if (!s) return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const status = url.searchParams.get("status");

    const where = status ? { status: status as any } : {};

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, pages: Math.ceil(total / limit) });
  } catch (e: any) {
    console.error("ADMIN_TX_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
