import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Charge Stripe.js une seule fois, à la demande. Appelé en préchargement
 * pendant que le payeur remplit le formulaire, puis réutilisé tel quel
 * à l'étape carte : le script est déjà en cache, l'affichage est immédiat.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
