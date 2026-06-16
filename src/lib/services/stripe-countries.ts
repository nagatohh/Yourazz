/**
 * Pays / devises supportés par Stripe Connect pour les comptes connectés.
 *
 * NOTE IMPORTANT : cette liste est une garde *préventive* pour afficher un
 * message propre AVANT l'appel Stripe. La source de vérité reste Stripe : si un
 * pays/compte passe cette garde mais est refusé côté Stripe, l'erreur Stripe est
 * remontée telle quelle (voir api/bank-accounts/route.ts). On ne promet donc
 * jamais un retrait que Stripe ne permet pas.
 *
 * Liste basée sur les pays où Stripe permet de créer des comptes connectés
 * recevant des transfers/payouts. À élargir si Stripe ouvre de nouveaux pays.
 */

// country (ISO 3166-1 alpha-2 majuscule) → devise par défaut (ISO 4217 majuscule)
export const SUPPORTED_CONNECT_COUNTRIES: Record<string, string> = {
  // Zone euro
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", PT: "EUR",
  IE: "EUR", AT: "EUR", FI: "EUR", LU: "EUR", GR: "EUR", SK: "EUR", SI: "EUR",
  EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR", MT: "EUR",
  // Europe hors euro
  GB: "GBP", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
  RO: "RON", BG: "BGN", HU: "HUF",
  // Amérique du Nord
  US: "USD", CA: "CAD", MX: "MXN",
  // Asie-Pacifique
  AU: "AUD", NZ: "NZD", JP: "JPY", SG: "SGD", HK: "HKD",
  // Autres
  AE: "AED",
};

// Devises de retrait que l'on accepte de proposer côté Yourazz.
export const SUPPORTED_PAYOUT_CURRENCIES = ["EUR", "USD", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_PAYOUT_CURRENCIES)[number];

export const UNSUPPORTED_COUNTRY_MESSAGE =
  "Ce pays ou ce compte bancaire n'est pas encore supporté pour les retraits automatiques.";

export function normalizeCountry(country: string): string {
  return country.trim().toUpperCase();
}

export function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

export function isCountrySupported(country: string): boolean {
  return normalizeCountry(country) in SUPPORTED_CONNECT_COUNTRIES;
}

/** Devise par défaut d'un pays (null si pays non supporté). */
export function defaultCurrencyForCountry(country: string): string | null {
  return SUPPORTED_CONNECT_COUNTRIES[normalizeCountry(country)] ?? null;
}

/** Devise utilisable côté Yourazz (on borne aux devises qu'on sait traiter). */
export function isPayoutCurrencySupported(currency: string): boolean {
  return (SUPPORTED_PAYOUT_CURRENCIES as readonly string[]).includes(normalizeCurrency(currency));
}
