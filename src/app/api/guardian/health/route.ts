import { NextResponse } from "next/server";
import { getGuardianStatus } from "@/lib/guardian/guardian.service";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
  try {
    const status = await getGuardianStatus();
    const httpStatus = status.status === "BROKEN" ? 503 : 200;
    return NextResponse.json(
      { status: status.status, openIssues: status.openIssues, criticalIssues: status.criticalIssues },
      { status: httpStatus }
    );
  } catch {
    return NextResponse.json({ status: "BROKEN", error: "Guardian inaccessible" }, { status: 503 });
  }
}
