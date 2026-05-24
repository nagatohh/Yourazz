import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const c = await cookies();
  const hasSessionCookie = !!c.get("session")?.value;
  const session = await getSession();

  return NextResponse.json({
    hasSessionCookie,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    sessionValid: !!session,
    userId: session?.userId || null,
  });
}
