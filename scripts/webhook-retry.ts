import { db } from "../src/lib/db";

async function main() {
  console.log("[Guardian] Retrying stale webhooks...\n");

  const stale = await db.webhookEvent.findMany({
    where: {
      processed: false,
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  console.log(`Found ${stale.length} stale webhook(s)\n`);

  if (stale.length === 0) {
    console.log("Nothing to retry.");
    process.exit(0);
  }

  let reset = 0;
  for (const webhook of stale) {
    await db.webhookEvent.update({
      where: { id: webhook.id },
      data: { processed: false, error: null, attempts: { increment: 1 } },
    });
    reset++;
    console.log(`  Reset: ${webhook.eventId} (${webhook.eventType})`);
  }

  console.log(`\n${reset} webhook(s) reset for reprocessing.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[Guardian] Fatal error:", e.message);
  process.exit(2);
});
