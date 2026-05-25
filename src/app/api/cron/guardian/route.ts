import { NextResponse } from "next/server";
import { runAllChecks, repairAllSafeIssues } from "@/lib/guardian/guardian.service";
import { guardianLog } from "@/lib/guardian/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    await guardianLog("INFO", "Cron Guardian: demarrage");

    const report = await runAllChecks();

    let repairResults = null;
    if (report.autoRepairableIssues > 0) {
      repairResults = await repairAllSafeIssues();
    }

    await guardianLog("INFO", `Cron Guardian: termine — ${report.overallStatus}`);

    return NextResponse.json({
      report: {
        status: report.overallStatus,
        totalIssues: report.totalIssues,
        criticalIssues: report.criticalIssues,
        autoRepaired: repairResults?.succeeded ?? 0,
        durationMs: report.durationMs,
      },
      repairs: repairResults,
    });
  } catch (e) {
    await guardianLog("ERROR", `Cron Guardian: erreur — ${(e as Error).message}`);
    return NextResponse.json(
      { error: "Erreur cron Guardian", details: (e as Error).message },
      { status: 500 }
    );
  }
}
