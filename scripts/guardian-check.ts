import { runAllChecks } from "../src/lib/guardian/guardian.service";

async function main() {
  console.log("[Guardian] Running all checks...\n");

  const report = await runAllChecks();

  console.log(`Status: ${report.overallStatus}`);
  console.log(`Duration: ${report.durationMs}ms`);
  console.log(`Issues: ${report.totalIssues} (${report.criticalIssues} critical, ${report.autoRepairableIssues} auto-repairable)\n`);

  for (const check of report.checks) {
    const icon = check.status === "HEALTHY" ? "OK" : check.status === "DEGRADED" ? "!!" : "XX";
    console.log(`  [${icon}] ${check.type} — ${check.message} (${check.durationMs}ms)`);
    for (const issue of check.issues) {
      console.log(`      [${issue.severity}] ${issue.title}${issue.autoRepairable ? " (auto-repairable)" : ""}`);
    }
  }

  process.exit(report.overallStatus === "BROKEN" ? 1 : 0);
}

main().catch((e) => {
  console.error("[Guardian] Fatal error:", e.message);
  process.exit(2);
});
