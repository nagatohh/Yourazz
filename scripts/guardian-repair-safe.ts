import { repairAllSafeIssues } from "../src/lib/guardian/guardian.service";

async function main() {
  console.log("[Guardian] Running safe auto-repairs...\n");

  const results = await repairAllSafeIssues();

  console.log(`Attempted: ${results.attempted}`);
  console.log(`Succeeded: ${results.succeeded}`);
  console.log(`Failed: ${results.failed}\n`);

  for (const r of results.results) {
    const icon = r.result.success ? "OK" : "FAIL";
    console.log(`  [${icon}] ${r.issue} — ${r.result.message}`);
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("[Guardian] Fatal error:", e.message);
  process.exit(2);
});
