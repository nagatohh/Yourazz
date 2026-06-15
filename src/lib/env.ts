import { z } from "zod";

/**
 * Validation des variables d'environnement.
 *
 * Les variables REQUISES sont indispensables au fonctionnement (auth, paiements,
 * chiffrement, cron). Les OPTIONNELLES sont validées uniquement sur leur FORMAT
 * quand elles sont présentes (un secret mal formé est aussi dangereux qu'absent).
 *
 * Appelé au démarrage du serveur via src/instrumentation.ts (fail-fast en prod).
 */
const envSchema = z.object({
  // ── Requis ────────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),

  // ── Optionnel — validé sur le format si présent ─────────────────────────────
  // Webhook des comptes connectés (payouts/account.updated). Sans lui, seuls les
  // évènements "votre compte" sont vérifiables.
  STRIPE_CONNECT_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "STRIPE_CONNECT_WEBHOOK_SECRET must start with whsec_")
    .optional(),
  RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY must start with re_").optional(),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").optional(),

  // Rate limiting distribué (Vercel serverless). Sans ces deux variables, le
  // rate limiter retombe sur un compteur en mémoire (par instance, non partagé).
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL").optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
}).passthrough();

export type Env = z.infer<typeof envSchema>;

export interface EnvValidationResult {
  success: boolean;
  errors: string[];
}

export function validateEnv(): EnvValidationResult {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { success: false, errors };
  }
  return { success: true, errors: [] };
}
