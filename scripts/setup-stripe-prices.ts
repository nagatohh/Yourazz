import Stripe from "stripe";
import * as dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("🔍 Vérification des prices Stripe...\n");

  const plans = [
    { lookupKey: "yourazz_pro_monthly", name: "Yourazz Pro", amount: 799, env: "STRIPE_PRICE_ID_PRO" },
    { lookupKey: "yourazz_business_monthly", name: "Yourazz Business", amount: 1999, env: "STRIPE_PRICE_ID_BUSINESS" },
  ];

  for (const plan of plans) {
    const existing = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, limit: 1 });

    if (existing.data[0]) {
      console.log(`✅ ${plan.name} existe déjà: ${existing.data[0].id} (lookup_key: ${plan.lookupKey})`);
      continue;
    }

    console.log(`⚠️  ${plan.name} non trouvé — création...`);

    const product = await stripe.products.create({ name: plan.name });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: "eur",
      recurring: { interval: "month" },
      lookup_key: plan.lookupKey,
    });

    console.log(`✅ ${plan.name} créé: ${price.id}`);
    console.log(`   → Ajoutez dans .env: ${plan.env}=${price.id}\n`);
  }

  console.log("\n✨ Terminé !");
}

main().catch((e) => {
  console.error("❌ Erreur:", e.message);
  process.exit(1);
});
