import { walletConsistencyCheck } from "../src/lib/guardian/checks/wallet";

async function main() {
  console.log("[Guardian] Wallet consistency check...\n");

  const result = await walletConsistencyCheck();

  console.log(`Status: ${result.status}`);
  console.log(`Message: ${result.message}`);
  console.log(`Duration: ${result.durationMs}ms\n`);

  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      console.log(`  [${issue.severity}] ${issue.title}`);
      if (issue.description) console.log(`    ${issue.description}`);
    }
  } else {
    console.log("  All wallets are consistent.");
  }

  process.exit(result.status === "BROKEN" ? 1 : 0);
}

main().catch((e) => {
  console.error("[Guardian] Fatal error:", e.message);
  process.exit(2);
});
