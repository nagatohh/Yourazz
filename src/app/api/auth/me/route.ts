import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: s.userId }, select: { id: true, email: true, name: true, role: true } });
  return NextResponse.json({ user });
}
