import { NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/auth/admin";
import { repairAllSafeIssues } from "@/lib/guardian/guardian.service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  const owner = await getOwnerSession();
  if (!owner) {
    return NextResponse.json({ error: "Reserves au owner" }, { status: 403 });
  }

  try {
    const results = await repairAllSafeIssues();
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur lors de la reparation", details: (e as Error).message },
      { status: 500 }
    );
  }
}
