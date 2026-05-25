import { db } from "@/lib/db";
import type { CheckResult, IssueFound } from "../types";

export async function authHealthCheck(): Promise<CheckResult> {
  const start = Date.now();
  const issues: IssueFound[] = [];

  // Check JWT_SECRET
  if (!process.env.JWT_SECRET) {
    issues.push({
      type: "JWT_SECRET_MISSING",
      severity: "CRITICAL",
      title: "JWT_SECRET manquant — auth completement cassee",
      source: "auth",
      autoRepairable: false,
    });
  } else if (process.env.JWT_SECRET.length < 32) {
    issues.push({
      type: "JWT_SECRET_WEAK",
      severity: "WARNING",
      title: "JWT_SECRET trop court (< 32 chars)",
      source: "auth",
      autoRepairable: false,
    });
  }

  // Check admin users exist
  const adminCount = await db.user.count({
    where: { role: { in: ["ADMIN", "ADMIN_OWNER"] }, status: "ACTIVE" },
  });

  if (adminCount === 0) {
    issues.push({
      type: "NO_ACTIVE_ADMIN",
      severity: "CRITICAL",
      title: "Aucun administrateur actif en base",
      source: "auth",
      autoRepairable: true,
    });
  }

  // Check ADMIN_EMAILS config vs DB
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean) || [];
  if (adminEmails.length > 0) {
    for (const email of adminEmails) {
      const user = await db.user.findUnique({ where: { email } });
      if (user && user.role !== "ADMIN" && user.role !== "ADMIN_OWNER") {
        issues.push({
          type: "ADMIN_EMAIL_NOT_ADMIN",
          severity: "WARNING",
          title: `${email} est dans ADMIN_EMAILS mais a role=${user.role}`,
          source: "auth",
          metadata: { email, currentRole: user.role },
          autoRepairable: true,
        });
      }
    }
  }

  // Check suspended admins
  const suspendedAdmins = await db.user.count({
    where: { role: { in: ["ADMIN", "ADMIN_OWNER"] }, status: { not: "ACTIVE" } },
  });

  if (suspendedAdmins > 0) {
    issues.push({
      type: "SUSPENDED_ADMIN",
      severity: "WARNING",
      title: `${suspendedAdmins} admin(s) suspendu(s)`,
      source: "auth",
      metadata: { count: suspendedAdmins },
      autoRepairable: false,
    });
  }

  const hasCritical = issues.some((i) => i.severity === "CRITICAL");

  return {
    type: "AUTH",
    status: hasCritical ? "BROKEN" : issues.length > 0 ? "DEGRADED" : "HEALTHY",
    severity: hasCritical ? "CRITICAL" : issues.length > 0 ? "WARNING" : "INFO",
    message: issues.length === 0 ? `Auth OK — ${adminCount} admin(s) actif(s)` : `${issues.length} probleme(s)`,
    details: { adminCount, suspendedAdmins, adminEmailsConfigured: adminEmails.length },
    issues,
    durationMs: Date.now() - start,
  };
}
