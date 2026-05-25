import { db } from "@/lib/db";
import type { CheckResult, GuardianReport, HealthStatus, IssueFound, RepairResult } from "./types";
import { guardianLog } from "./logger";
import { repairIssue } from "./recovery.service";
import { databaseHealthCheck } from "./checks/database";
import { stripeHealthCheck } from "./checks/stripe";
import { authHealthCheck } from "./checks/auth";
import { walletConsistencyCheck } from "./checks/wallet";
import { environmentHealthCheck } from "./checks/environment";
import { webhookConsistencyCheck } from "./checks/webhooks";
import { securityHealthCheck } from "./checks/security";

export async function runAllChecks(): Promise<GuardianReport> {
  const start = Date.now();

  await guardianLog("INFO", "Guardian: demarrage de tous les checks");

  const results = await Promise.allSettled([
    databaseHealthCheck(),
    stripeHealthCheck(),
    authHealthCheck(),
    walletConsistencyCheck(),
    environmentHealthCheck(),
    webhookConsistencyCheck(),
    securityHealthCheck(),
  ]);

  const checks: CheckResult[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const types = ["DATABASE", "STRIPE", "AUTH", "WALLET", "ENVIRONMENT", "WEBHOOKS", "SECURITY"];
    return {
      type: types[i],
      status: "BROKEN" as const,
      severity: "CRITICAL" as const,
      message: `Check echoue: ${(r.reason as Error)?.message || "Erreur inconnue"}`,
      issues: [],
      durationMs: 0,
    };
  });

  // Persist check results
  for (const check of checks) {
    await db.guardianCheck.create({
      data: {
        type: check.type,
        status: check.status,
        severity: check.severity,
        message: check.message,
        details: (check.details as object) ?? undefined,
        duration: check.durationMs,
      },
    });
  }

  // Persist new issues
  const allIssues = checks.flatMap((c) => c.issues);
  for (const issue of allIssues) {
    await db.guardianIssue.create({
      data: {
        type: issue.type,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        source: issue.source,
        metadata: (issue.metadata as object) ?? undefined,
        autoRepairable: issue.autoRepairable,
      },
    });
  }

  const overallStatus = determineOverallStatus(checks);

  await guardianLog(
    overallStatus === "HEALTHY" ? "INFO" : "WARNING",
    `Guardian: termine — ${overallStatus} (${allIssues.length} issue(s), ${Date.now() - start}ms)`
  );

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    checks,
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter((i) => i.severity === "CRITICAL").length,
    autoRepairableIssues: allIssues.filter((i) => i.autoRepairable).length,
    durationMs: Date.now() - start,
  };
}

export async function repairAllSafeIssues(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  results: Array<{ issue: string; result: RepairResult }>;
}> {
  await guardianLog("INFO", "Guardian: demarrage reparation auto");

  const openIssues = await db.guardianIssue.findMany({
    where: { status: "OPEN", autoRepairable: true },
    orderBy: { createdAt: "desc" },
  });

  const results: Array<{ issue: string; result: RepairResult }> = [];
  let succeeded = 0;
  let failed = 0;

  for (const dbIssue of openIssues) {
    const issue: IssueFound = {
      type: dbIssue.type,
      severity: dbIssue.severity as IssueFound["severity"],
      title: dbIssue.title,
      description: dbIssue.description ?? undefined,
      source: dbIssue.source,
      metadata: dbIssue.metadata as Record<string, unknown> | undefined,
      autoRepairable: dbIssue.autoRepairable,
    };

    const result = await repairIssue(issue);

    await db.guardianRepair.create({
      data: {
        issueId: dbIssue.id,
        action: issue.type,
        success: result.success,
        details: (result.details as object) ?? undefined,
        message: result.message,
      },
    });

    if (result.success) {
      await db.guardianIssue.update({
        where: { id: dbIssue.id },
        data: { status: "REPAIRED", repairedAt: new Date() },
      });
      succeeded++;
    } else {
      await db.guardianIssue.update({
        where: { id: dbIssue.id },
        data: { status: "MANUAL_REQUIRED" },
      });
      failed++;
    }

    results.push({ issue: dbIssue.title, result });
  }

  await guardianLog(
    "INFO",
    `Guardian: reparation terminee — ${succeeded}/${openIssues.length} repare(s), ${failed} echec(s)`
  );

  return { attempted: openIssues.length, succeeded, failed, results };
}

export async function getGuardianStatus(): Promise<{
  status: HealthStatus;
  lastCheck: Date | null;
  openIssues: number;
  criticalIssues: number;
  recentRepairs: number;
}> {
  const lastCheck = await db.guardianCheck.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, status: true },
  });

  const openIssues = await db.guardianIssue.count({ where: { status: "OPEN" } });
  const criticalIssues = await db.guardianIssue.count({
    where: { status: "OPEN", severity: { in: ["CRITICAL", "ERROR"] } },
  });
  const recentRepairs = await db.guardianRepair.count({
    where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, success: true },
  });

  let status: HealthStatus = "HEALTHY";
  if (criticalIssues > 0) status = "BROKEN";
  else if (openIssues > 0) status = "DEGRADED";

  return {
    status,
    lastCheck: lastCheck?.createdAt ?? null,
    openIssues,
    criticalIssues,
    recentRepairs,
  };
}

export async function getGuardianLogs(limit = 50) {
  return db.guardianLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function determineOverallStatus(checks: CheckResult[]): HealthStatus {
  if (checks.some((c) => c.status === "BROKEN")) return "BROKEN";
  if (checks.some((c) => c.status === "DEGRADED")) return "DEGRADED";
  return "HEALTHY";
}
