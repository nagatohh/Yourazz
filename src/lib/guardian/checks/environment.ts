import type { CheckResult, IssueFound } from "../types";

const REQUIRED_VARS = [
  { key: "DATABASE_URL", label: "Base de donnees" },
  { key: "JWT_SECRET", label: "Secret JWT" },
  { key: "STRIPE_SECRET_KEY", label: "Cle secrete Stripe" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", label: "Cle publique Stripe" },
  { key: "ENCRYPTION_KEY", label: "Cle de chiffrement" },
];

const RECOMMENDED_VARS = [
  { key: "STRIPE_WEBHOOK_SECRET", label: "Secret webhook Stripe" },
  { key: "NEXT_PUBLIC_APP_URL", label: "URL de l'application" },
];

export async function environmentHealthCheck(): Promise<CheckResult> {
  const start = Date.now();
  const issues: IssueFound[] = [];

  for (const v of REQUIRED_VARS) {
    if (!process.env[v.key]) {
      issues.push({
        type: "ENV_MISSING_REQUIRED",
        severity: "CRITICAL",
        title: `Variable ${v.key} manquante (${v.label})`,
        source: "environment",
        metadata: { variable: v.key },
        autoRepairable: false,
      });
    }
  }

  for (const v of RECOMMENDED_VARS) {
    if (!process.env[v.key]) {
      issues.push({
        type: "ENV_MISSING_RECOMMENDED",
        severity: "WARNING",
        title: `Variable ${v.key} manquante (${v.label})`,
        source: "environment",
        metadata: { variable: v.key },
        autoRepairable: false,
      });
    }
  }

  // Check for test keys in production
  if (process.env.NODE_ENV === "production") {
    if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
      issues.push({
        type: "STRIPE_TEST_KEY_IN_PROD",
        severity: "WARNING",
        title: "Cle Stripe TEST utilisee en production",
        source: "environment",
        autoRepairable: false,
      });
    }
  }

  // Check JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    issues.push({
      type: "JWT_SECRET_WEAK",
      severity: "WARNING",
      title: "JWT_SECRET trop court — risque de securite",
      source: "environment",
      autoRepairable: false,
    });
  }

  const hasCritical = issues.some((i) => i.severity === "CRITICAL");

  return {
    type: "ENVIRONMENT",
    status: hasCritical ? "BROKEN" : issues.length > 0 ? "DEGRADED" : "HEALTHY",
    severity: hasCritical ? "CRITICAL" : issues.length > 0 ? "WARNING" : "INFO",
    message: issues.length === 0 ? "Environnement OK" : `${issues.length} variable(s) manquante(s) ou incorrecte(s)`,
    issues,
    durationMs: Date.now() - start,
  };
}
