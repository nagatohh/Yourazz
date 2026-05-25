import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { getGuardianLogs } from "@/lib/guardian/guardian.service";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  try {
    const logs = await getGuardianLogs(limit);
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur", details: (e as Error).message },
      { status: 500 }
    );
  }
}
