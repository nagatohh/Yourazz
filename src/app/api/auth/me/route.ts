import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ user: null }, { status: 401 });
    const user = await db.user.findUnique({
      where: { id: s.userId },
      select: { id: true, email: true, name: true, role: true, emailVerified: true },
    });
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user });
  } catch (e: any) {
    console.error("ME_ERROR:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
