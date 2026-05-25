import { db } from "@/lib/db";
import type { CheckResult, IssueFound } from "../types";

export async function securityHealthCheck(): Promise<CheckResult> {
  const start = Date.now();
  const issues: IssueFound[] = [];

  // Check for users with suspicious login patterns (many failed attempts)
  const recentFailedLogins = await db.securityLog.count({
    where: {
      action: "LOGIN_FAILED",
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (recentFailedLogins > 20) {
    issues.push({
      type: "HIGH_FAILED_LOGINS",
      severity: "WARNING",
      title: `${recentFailedLogins} tentatives de connexion echouees en 1h`,
      source: "security",
      metadata: { count: recentFailedLogins },
      autoRepairable: false,
    });
  }

  // Check for blocked users trying to access
  const blockedAccessAttempts = await db.securityLog.count({
    where: {
      action: "BLOCKED_ACCESS_ATTEMPT",
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (blockedAccessAttempts > 0) {
    issues.push({
      type: "BLOCKED_USER_ACCESS_ATTEMPTS",
      severity: "INFO",
      title: `${blockedAccessAttempts} tentative(s) d'acces par utilisateurs bloques (24h)`,
      source: "security",
      metadata: { count: blockedAccessAttempts },
      autoRepairable: false,
    });
  }

  // Check ENCRYPTION_KEY presence and strength
  if (!process.env.ENCRYPTION_KEY) {
    issues.push({
      type: "ENCRYPTION_KEY_MISSING",
      severity: "CRITICAL",
      title: "ENCRYPTION_KEY manquante — donnees sensibles non chiffrees",
      source: "security",
      autoRepairable: false,
    });
  } else if (process.env.ENCRYPTION_KEY.length < 32) {
    issues.push({
      type: "ENCRYPTION_KEY_WEAK",
      severity: "WARNING",
      title: "ENCRYPTION_KEY trop courte (< 32 chars)",
      source: "security",
      autoRepairable: false,
    });
  }

  // Check for admin role changes in last 24h
  const recentRoleChanges = await db.securityLog.findMany({
    where: {
      action: "ROLE_CHANGED",
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (recentRoleChanges.length > 0) {
    issues.push({
      type: "RECENT_ROLE_CHANGES",
      severity: "INFO",
      title: `${recentRoleChanges.length} changement(s) de role en 24h`,
      source: "security",
      metadata: { count: recentRoleChanges.length },
      autoRepairable: false,
    });
  }

  // Check if any user has multiple active sessions (potential token leak)
  // This is informational only
  const suspiciousTokenUsage = await db.securityLog.count({
    where: {
      action: "TOKEN_REUSE_DETECTED",
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (suspiciousTokenUsage > 0) {
    issues.push({
      type: "TOKEN_REUSE_DETECTED",
      severity: "ERROR",
      title: `${suspiciousTokenUsage} reutilisation(s) suspecte(s) de token detectee(s)`,
      source: "security",
      metadata: { count: suspiciousTokenUsage },
      autoRepairable: false,
    });
  }

  const hasCritical = issues.some((i) => i.severity === "CRITICAL" || i.severity === "ERROR");

  return {
    type: "SECURITY",
    status: hasCritical ? "BROKEN" : issues.length > 0 ? "DEGRADED" : "HEALTHY",
    severity: hasCritical ? "CRITICAL" : issues.length > 0 ? "WARNING" : "INFO",
    message: issues.length === 0
      ? "Securite OK"
      : `${issues.length} alerte(s) securite`,
    details: { recentFailedLogins, blockedAccessAttempts },
    issues,
    durationMs: Date.now() - start,
  };
}
