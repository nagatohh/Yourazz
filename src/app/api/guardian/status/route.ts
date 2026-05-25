import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { getGuardianStatus } from "@/lib/guardian/guardian.service";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  try {
    const status = await getGuardianStatus();
    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur Guardian", details: (e as Error).message },
      { status: 500 }
    );
  }
}
