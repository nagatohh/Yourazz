import { db } from "@/lib/db";
import type { CheckResult, IssueFound } from "../types";

export async function walletConsistencyCheck(): Promise<CheckResult> {
  const start = Date.now();
  const issues: IssueFound[] = [];

  const wallets = await db.wallet.findMany({
    include: { user: { select: { id: true, email: true, status: true } } },
  });

  for (const wallet of wallets) {
    // Calculate expected available balance from succeeded transactions
    const succeededPayins = await db.transaction.aggregate({
      _sum: { netAmount: true },
      where: { walletId: wallet.id, type: "PAYIN", status: "SUCCEEDED" },
    });

    const succeededPayouts = await db.transaction.aggregate({
      _sum: { amount: true },
      where: { walletId: wallet.id, type: "PAYOUT", status: { in: ["SUCCEEDED", "PROCESSING"] } },
    });

    const refunds = await db.transaction.aggregate({
      _sum: { netAmount: true },
      where: { walletId: wallet.id, status: "REFUNDED" },
    });

    const expectedAvailable =
      (succeededPayins._sum.netAmount || 0) -
      (succeededPayouts._sum.amount || 0) -
      (refunds._sum.netAmount || 0);

    const diff = wallet.availableBalance - expectedAvailable;

    if (Math.abs(diff) > 0) {
      issues.push({
        type: "WALLET_BALANCE_MISMATCH",
        severity: Math.abs(diff) > 1000 ? "ERROR" : "WARNING",
        title: `Wallet ${wallet.id} — ecart de ${diff} centimes`,
        description: `Solde actuel: ${wallet.availableBalance}, attendu: ${expectedAvailable}`,
        source: "wallet",
        metadata: {
          walletId: wallet.id,
          userId: wallet.userId,
          userEmail: wallet.user.email,
          currentBalance: wallet.availableBalance,
          expectedBalance: expectedAvailable,
          difference: diff,
        },
        autoRepairable: true,
      });
    }

    // Check pending balance
    const pendingTx = await db.transaction.aggregate({
      _sum: { amount: true },
      where: { walletId: wallet.id, status: "PENDING" },
    });

    const expectedPending = pendingTx._sum.amount || 0;
    const pendingDiff = wallet.pendingBalance - expectedPending;

    if (Math.abs(pendingDiff) > 0) {
      issues.push({
        type: "WALLET_PENDING_MISMATCH",
        severity: "WARNING",
        title: `Wallet ${wallet.id} — ecart pending de ${pendingDiff} centimes`,
        source: "wallet",
        metadata: {
          walletId: wallet.id,
          currentPending: wallet.pendingBalance,
          expectedPending,
          difference: pendingDiff,
        },
        autoRepairable: true,
      });
    }
  }

  // Check succeeded transactions that didn't credit wallet
  const uncreditedTx = await db.transaction.findMany({
    where: {
      type: "PAYIN",
      status: "SUCCEEDED",
      netAmount: { gt: 0 },
    },
    include: { wallet: true },
  });

  // This is already captured by balance mismatch above

  const hasCritical = issues.some((i) => i.severity === "CRITICAL" || i.severity === "ERROR");

  return {
    type: "WALLET",
    status: hasCritical ? "BROKEN" : issues.length > 0 ? "DEGRADED" : "HEALTHY",
    severity: hasCritical ? "ERROR" : issues.length > 0 ? "WARNING" : "INFO",
    message: issues.length === 0
      ? `Wallets OK — ${wallets.length} wallet(s) coherent(s)`
      : `${issues.length} incoherence(s) detectee(s)`,
    details: { walletsChecked: wallets.length, issuesFound: issues.length },
    issues,
    durationMs: Date.now() - start,
  };
}
