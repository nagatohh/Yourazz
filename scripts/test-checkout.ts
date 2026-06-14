import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function test() {
  console.log("Testing with key:", process.env.STRIPE_SECRET_KEY?.substring(0, 15) + "...");

  const prices = await stripe.prices.list({ lookup_keys: ["yourazz_pro_monthly"], active: true, limit: 1 });
  console.log("Price found:", prices.data[0]?.id || "NONE");

  if (!prices.data[0]) {
    console.error("NO PRICE FOUND - this is the bug!");
    return;
  }

  const customer = await stripe.customers.create({ email: "test-checkout@yourazz.xyz", metadata: { test: "true" } });
  console.log("Customer created:", customer.id);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      success_url: "https://yourazz.xyz/dashboard/plan?upgraded=1",
      cancel_url: "https://yourazz.xyz/dashboard/plan",
      metadata: { purpose: "yourazz_access", userId: "test", plan: "PRO" },
      subscription_data: { metadata: { purpose: "yourazz_access", userId: "test", plan: "PRO" } },
      allow_promotion_codes: true,
    });
    console.log("SUCCESS! Session URL:", session.url?.substring(0, 60) + "...");
  } catch (e: any) {
    console.error("CHECKOUT ERROR:", e.message);
    console.error("Type:", e.type);
    console.error("Code:", e.code);
  }

  await stripe.customers.del(customer.id);
  console.log("Cleanup done");
}

test();
