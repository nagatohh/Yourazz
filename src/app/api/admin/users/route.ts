import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export async function GET() {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, emailVerified: true, createdAt: true, wallet: { select: { availableBalance: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ users });
}
