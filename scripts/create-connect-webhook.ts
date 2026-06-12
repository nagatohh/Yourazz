/**
 * Crée la destination webhook "comptes connectés" (connect: true) qui reçoit
 * les évènements des comptes Connect des users : statuts de payout, mises à
 * jour de compte, comptes bancaires externes.
 *
 * Le secret de signature affiché doit être ajouté dans Vercel :
 *   STRIPE_CONNECT_WEBHOOK_SECRET
 *
 * Usage : npx tsx scripts/create-connect-webhook.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import Stripe from "stripe";

// .env minimal parse — tsx ne charge pas .env tout seul
for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY introuvable dans .env");
  process.exit(1);
}

const stripe = new Stripe(key);
// URL de prod en dur : le .env local pointe sur localhost, or cette
// destination Stripe est une ressource de production.
const url = "https://yourazz.xyz/api/webhooks/stripe";

async function main() {
  // Idempotence : ne pas créer de doublon si une destination Connect existe déjà
  const existing = await stripe.webhookEndpoints.list({ limit: 20 });
  const connectEndpoint = existing.data.find((e) => (e as any).application === null && e.url === url && (e.metadata as any)?.purpose === "connect-events");
  if (connectEndpoint) {
    console.log(`Une destination Connect existe déjà : ${connectEndpoint.id} (secret non récupérable après création)`);
    return;
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url,
    connect: true,
    description: "Yourazz — évènements des comptes connectés (payouts users)",
    metadata: { purpose: "connect-events" },
    enabled_events: [
      "payout.paid",
      "payout.failed",
      "payout.canceled",
      "account.updated",
      "account.external_account.created",
      "account.external_account.updated",
      "account.external_account.deleted",
    ],
  });

  console.log("✓ Destination Connect créée :", endpoint.id);
  console.log("");
  console.log("SECRET DE SIGNATURE (à mettre dans Vercel → STRIPE_CONNECT_WEBHOOK_SECRET) :");
  console.log(endpoint.secret);
}

main().catch((e) => {
  console.error("CREATE_CONNECT_WEBHOOK_ERROR:", e?.message || e);
  process.exit(1);
});
