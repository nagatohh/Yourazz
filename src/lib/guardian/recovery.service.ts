import { db } from "@/lib/db";
import type { IssueFound, RepairResult } from "./types";
import { guardianLog } from "./logger";

export async function repairIssue(issue: IssueFound): Promise<RepairResult> {
  if (!issue.autoRepairable) {
    return { success: false, message: "Issue non reparable automatiquement" };
  }

  switch (issue.type) {
    case "WALLET_BALANCE_MISMATCH":
      return repairWalletBalance(issue);
    case "WALLET_PENDING_MISMATCH":
      return repairWalletPending(issue);
    case "MISSING_WALLET":
      return repairMissingWallets();
    case "NO_ACTIVE_ADMIN":
      return repairNoActiveAdmin();
    case "ADMIN_EMAIL_NOT_ADMIN":
      return repairAdminEmailRole(issue);
    case "WEBHOOKS_STALE_UNPROCESSED":
      return retryStaleWebhooks();
    default:
      return { success: false, message: `Pas de reparation pour le type: ${issue.type}` };
  }
}

async function repairWalletBalance(issue: IssueFound): Promise<RepairResult> {
  const { walletId, expectedBalance } = issue.metadata as {
    walletId: string;
    expectedBalance: number;
  };

  if (expectedBalance === undefined || !walletId) {
    return { success: false, message: "Metadata insuffisante pour reparer" };
  }

  const wallet = await db.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) {
    return { success: false, message: `Wallet ${walletId} introuvable` };
  }

  const previousBalance = wallet.availableBalance;

  // Recalculate from scratch
  const succeededPayins = await db.transaction.aggregate({
    _sum: { netAmount: true },
    where: { walletId, type: "PAYIN", status: "SUCCEEDED" },
  });

  const succeededPayouts = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { walletId, type: "PAYOUT", status: { in: ["SUCCEEDED", "PROCESSING"] } },
  });

  const refunds = await db.transaction.aggregate({
    _sum: { netAmount: true },
    where: { walletId, status: "REFUNDED" },
  });

  const correctBalance =
    (succeededPayins._sum.netAmount || 0) -
    (succeededPayouts._sum.amount || 0) -
    (refunds._sum.netAmount || 0);

  await db.wallet.update({
    where: { id: walletId },
    data: { availableBalance: correctBalance },
  });

  await guardianLog("REPAIR", `Wallet ${walletId}: balance corrigee ${previousBalance} -> ${correctBalance}`);

  return {
    success: true,
    message: `Balance corrigee: ${previousBalance} -> ${correctBalance}`,
    details: { walletId, previousBalance, newBalance: correctBalance },
  };
}

async function repairWalletPending(issue: IssueFound): Promise<RepairResult> {
  const { walletId, expectedPending } = issue.metadata as {
    walletId: string;
    expectedPending: number;
  };

  if (expectedPending === undefined || !walletId) {
    return { success: false, message: "Metadata insuffisante" };
  }

  const wallet = await db.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) {
    return { success: false, message: `Wallet ${walletId} introuvable` };
  }

  const previousPending = wallet.pendingBalance;

  const pendingTx = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { walletId, status: "PENDING" },
  });

  const correctPending = pendingTx._sum.amount || 0;

  await db.wallet.update({
    where: { id: walletId },
    data: { pendingBalance: correctPending },
  });

  await guardianLog("REPAIR", `Wallet ${walletId}: pending corrige ${previousPending} -> ${correctPending}`);

  return {
    success: true,
    message: `Pending corrige: ${previousPending} -> ${correctPending}`,
    details: { walletId, previousPending, newPending: correctPending },
  };
}

async function repairMissingWallets(): Promise<RepairResult> {
  const usersWithoutWallet = await db.user.findMany({
    where: { wallet: null, status: "ACTIVE" },
    select: { id: true, email: true },
  });

  if (usersWithoutWallet.length === 0) {
    return { success: true, message: "Aucun wallet manquant" };
  }

  let created = 0;
  for (const user of usersWithoutWallet) {
    await db.wallet.create({
      data: {
        userId: user.id,
        availableBalance: 0,
        pendingBalance: 0,
        currency: "EUR",
      },
    });
    created++;
  }

  await guardianLog("REPAIR", `${created} wallet(s) cree(s) pour utilisateurs actifs`);

  return {
    success: true,
    message: `${created} wallet(s) cree(s)`,
    details: { created, users: usersWithoutWallet.map((u) => u.email) },
  };
}

async function repairNoActiveAdmin(): Promise<RepairResult> {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean) || [];

  if (adminEmails.length === 0) {
    return { success: false, message: "ADMIN_EMAILS non configure — impossible de restaurer un admin" };
  }

  let repaired = 0;
  for (const email of adminEmails) {
    const user = await db.user.findUnique({ where: { email } });
    if (user && user.status !== "ACTIVE") {
      await db.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
      repaired++;
      await guardianLog("REPAIR", `Admin ${email} reactive`);
    } else if (user && user.role !== "ADMIN" && user.role !== "ADMIN_OWNER") {
      await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      repaired++;
      await guardianLog("REPAIR", `${email} promu ADMIN`);
    }
  }

  if (repaired === 0) {
    return { success: false, message: "Aucun admin reparable via ADMIN_EMAILS" };
  }

  return { success: true, message: `${repaired} admin(s) restaure(s)` };
}

async function repairAdminEmailRole(issue: IssueFound): Promise<RepairResult> {
  const { email } = issue.metadata as { email: string };
  if (!email) return { success: false, message: "Email manquant dans metadata" };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { success: false, message: `Utilisateur ${email} introuvable` };

  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await guardianLog("REPAIR", `${email} promu ADMIN (etait ${user.role})`);

  return {
    success: true,
    message: `${email} promu ADMIN`,
    details: { email, previousRole: user.role },
  };
}

async function retryStaleWebhooks(): Promise<RepairResult> {
  const stale = await db.webhookEvent.findMany({
    where: {
      processed: false,
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    take: 20,
  });

  if (stale.length === 0) {
    return { success: true, message: "Aucun webhook a retraiter" };
  }

  // Mark as needing reprocessing — actual reprocessing happens via webhook handler
  let marked = 0;
  for (const webhook of stale) {
    await db.webhookEvent.update({
      where: { id: webhook.id },
      data: { error: "GUARDIAN_MARKED_FOR_RETRY" },
    });
    marked++;
  }

  await guardianLog("REPAIR", `${marked} webhook(s) marque(s) pour retry`);

  return {
    success: true,
    message: `${marked} webhook(s) marque(s) pour retraitement`,
    details: { marked },
  };
}
