import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { runAllChecks } from "@/lib/guardian/guardian.service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  try {
    const report = await runAllChecks();
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur lors des checks", details: (e as Error).message },
      { status: 500 }
    );
  }
}
