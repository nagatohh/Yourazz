import { db } from "@/lib/db";
import type { CheckResult, IssueFound } from "../types";

export async function databaseHealthCheck(): Promise<CheckResult> {
  const start = Date.now();
  const issues: IssueFound[] = [];

  try {
    // Test basic connectivity
    await db.$queryRaw`SELECT 1`;

    // Verify critical tables exist and are accessible
    const [userCount, walletCount, txCount] = await Promise.all([
      db.user.count(),
      db.wallet.count(),
      db.transaction.count(),
    ]);

    // Check: users without wallets
    const usersWithoutWallet = await db.user.count({
      where: { wallet: null, status: "ACTIVE" },
    });

    if (usersWithoutWallet > 0) {
      issues.push({
        type: "MISSING_WALLET",
        severity: "WARNING",
        title: `${usersWithoutWallet} utilisateur(s) actif(s) sans wallet`,
        source: "database",
        metadata: { count: usersWithoutWallet },
        autoRepairable: true,
      });
    }

    // Check: orphan wallets (wallet without user)
    const orphanWallets = await db.wallet.count({
      where: { user: { status: "BLOCKED" } },
    });

    if (orphanWallets > 0) {
      issues.push({
        type: "BLOCKED_USER_WALLET",
        severity: "INFO",
        title: `${orphanWallets} wallet(s) d'utilisateurs bloques`,
        source: "database",
        metadata: { count: orphanWallets },
        autoRepairable: false,
      });
    }

    const hasCritical = issues.some((i) => i.severity === "CRITICAL" || i.severity === "ERROR");

    return {
      type: "DATABASE",
      status: hasCritical ? "BROKEN" : issues.length > 0 ? "DEGRADED" : "HEALTHY",
      severity: hasCritical ? "ERROR" : issues.length > 0 ? "WARNING" : "INFO",
      message: issues.length === 0
        ? `DB OK — ${userCount} users, ${walletCount} wallets, ${txCount} transactions`
        : `${issues.length} probleme(s) detecte(s)`,
      details: { userCount, walletCount, txCount, usersWithoutWallet },
      issues,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return {
      type: "DATABASE",
      status: "BROKEN",
      severity: "CRITICAL",
      message: `Connexion DB echouee: ${(e as Error).message}`,
      durationMs: Date.now() - start,
      issues: [{
        type: "DB_CONNECTION_FAILED",
        severity: "CRITICAL",
        title: "Base de donnees inaccessible",
        description: (e as Error).message,
        source: "database",
        autoRepairable: false,
      }],
    };
  }
}
