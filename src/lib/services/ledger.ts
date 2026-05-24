import { db } from "@/lib/db";
import type { TxType, TxStatus, PaymentMethod } from "@prisma/client";

interface CreatePayinParams {
  walletId: string;
  userId: string;
  amount: number;
  fees?: number;
  paymentMethod: PaymentMethod;
  providerTxId: string;
  provider: string;
  status: "PENDING" | "SUCCEEDED" | "AUTHORIZED";
  payerEmail?: string;
  payerName?: string;
  description?: string;
  idempotencyKey?: string;
}

interface ConfirmPayinParams {
  providerTxId: string;
  provider: string;
}

interface FailPayinParams {
  providerTxId: string;
  reason: string;
}

interface CreatePayoutParams {
  userId: string;
  walletId: string;
  bankAccountId: string;
  amount: number;
  fees?: number;
  providerPayoutId: string;
  provider: string;
}

const PLATFORM_FEE_BPS = 150; // 1.5%

function calculateFees(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_BPS) / 10000);
}

export async function createPayin(params: CreatePayinParams) {
  const fees = params.fees ?? calculateFees(params.amount);
  const netAmount = params.amount - fees;

  return db.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        walletId: params.walletId,
        userId: params.userId,
        type: "PAYIN",
        status: params.status,
        amount: params.amount,
        fees,
        netAmount,
        paymentMethod: params.paymentMethod,
        providerTransactionId: params.providerTxId,
        provider: params.provider,
        payerEmail: params.payerEmail,
        payerName: params.payerName,
        description: params.description,
        idempotencyKey: params.idempotencyKey,
      },
    });

    if (params.status === "SUCCEEDED") {
      await tx.wallet.update({
        where: { id: params.walletId },
        data: { availableBalance: { increment: netAmount } },
      });
      await tx.user.update({
        where: { id: params.userId },
        data: {
          dailyVolume: { increment: params.amount },
          monthlyVolume: { increment: params.amount },
        },
      });
    } else {
      await tx.wallet.update({
        where: { id: params.walletId },
        data: { pendingBalance: { increment: params.amount } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: params.userId,
        action: "PAYIN_CREATED",
        target: transaction.id,
        metadata: {
          amount: params.amount,
          fees,
          netAmount,
          method: params.paymentMethod,
          status: params.status,
        },
      },
    });

    return transaction;
  });
}

export async function confirmPayin(params: ConfirmPayinParams) {
  return db.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { providerTransactionId: params.providerTxId },
    });

    if (!transaction) return null;
    if (transaction.status === "SUCCEEDED") return transaction;
    if (transaction.status !== "PENDING" && transaction.status !== "AUTHORIZED") return null;

    const updated = await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCEEDED" },
    });

    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: {
        availableBalance: { increment: transaction.netAmount },
        pendingBalance: { decrement: transaction.amount },
      },
    });

    await tx.user.update({
      where: { id: transaction.userId },
      data: {
        dailyVolume: { increment: transaction.amount },
        monthlyVolume: { increment: transaction.amount },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: transaction.userId,
        action: "PAYIN_CONFIRMED",
        target: transaction.id,
        metadata: {
          amount: transaction.amount,
          netAmount: transaction.netAmount,
          provider: params.provider,
        },
      },
    });

    return updated;
  });
}

export async function failPayin(params: FailPayinParams) {
  return db.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { providerTransactionId: params.providerTxId },
    });

    if (!transaction) return null;
    if (transaction.status === "FAILED") return transaction;
    if (transaction.status !== "PENDING" && transaction.status !== "AUTHORIZED") return null;

    const updated = await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED", failureReason: params.reason },
    });

    if (transaction.status === "PENDING") {
      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { pendingBalance: { decrement: transaction.amount } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: transaction.userId,
        action: "PAYIN_FAILED",
        target: transaction.id,
        metadata: { reason: params.reason },
      },
    });

    return updated;
  });
}

export async function createPayout(params: CreatePayoutParams) {
  const fees = params.fees ?? 0;

  return db.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { id: params.walletId } });
    if (!wallet || wallet.availableBalance < params.amount) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    await tx.wallet.update({
      where: { id: params.walletId },
      data: { availableBalance: { decrement: params.amount } },
    });

    const payout = await tx.payout.create({
      data: {
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        amount: params.amount - fees,
        fees,
        status: "PROCESSING",
        providerPayoutId: params.providerPayoutId,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        walletId: params.walletId,
        userId: params.userId,
        type: "PAYOUT",
        status: "PROCESSING",
        amount: params.amount,
        fees,
        netAmount: params.amount - fees,
        providerTransactionId: params.providerPayoutId,
        provider: params.provider,
        description: `Retrait vers compte bancaire`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.userId,
        action: "PAYOUT_CREATED",
        target: payout.id,
        metadata: {
          amount: params.amount,
          fees,
          bankAccountId: params.bankAccountId,
        },
      },
    });

    return { payout, transaction };
  });
}

export async function confirmPayout(providerPayoutId: string) {
  return db.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { providerPayoutId },
    });

    if (!payout || payout.status === "PAID") return payout;

    await tx.payout.update({
      where: { id: payout.id },
      data: { status: "PAID" },
    });

    await tx.transaction.updateMany({
      where: { providerTransactionId: providerPayoutId },
      data: { status: "SUCCEEDED" },
    });

    await tx.auditLog.create({
      data: {
        userId: payout.userId,
        action: "PAYOUT_CONFIRMED",
        target: payout.id,
      },
    });

    return payout;
  });
}

export async function failPayout(providerPayoutId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { providerPayoutId },
    });

    if (!payout || payout.status === "FAILED") return payout;

    await tx.payout.update({
      where: { id: payout.id },
      data: { status: "FAILED", failureReason: reason },
    });

    await tx.transaction.updateMany({
      where: { providerTransactionId: providerPayoutId },
      data: { status: "FAILED", failureReason: reason },
    });

    // Refund the wallet
    const wallet = await tx.wallet.findFirst({ where: { userId: payout.userId } });
    if (wallet) {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalance: { increment: payout.amount + payout.fees } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: payout.userId,
        action: "PAYOUT_FAILED",
        target: payout.id,
        metadata: { reason },
      },
    });

    return payout;
  });
}
