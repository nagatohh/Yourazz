import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const s = await getAdminSession();
    if (!s) return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const status = url.searchParams.get("status");

    const where = status ? { status: status as any } : {};

    const [payouts, total] = await Promise.all([
      db.payout.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          bankAccount: { select: { ibanMasked: true, bankName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.payout.count({ where }),
    ]);

    return NextResponse.json({ payouts, total, page, pages: Math.ceil(total / limit) });
  } catch (e: any) {
    console.error("ADMIN_PAYOUTS_ERROR:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
