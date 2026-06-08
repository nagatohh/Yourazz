import { db } from "@/lib/db";
import type { RiskLevel } from "@prisma/client";

// ─── RISK SCORE SERVICE ─────────────────────────────────────────────────────

interface RiskInput {
  amount: number;
  payerEmail?: string;
  payerName?: string;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
  recipientAdminId: string;
  consentDurationMs?: number;
}

export async function calculateRiskScore(input: RiskInput): Promise<{
  score: number;
  level: RiskLevel;
  reasons: string[];
}> {
  const reasons: string[] = [];
  let score = 0;

  // High amount (> 500€)
  if (input.amount > 50000) {
    score += 15;
    reasons.push("Montant élevé (>500€)");
  }
  if (input.amount > 100000) {
    score += 10;
    reasons.push("Montant très élevé (>1000€)");
  }

  // Missing email
  if (!input.payerEmail) {
    score += 20;
    reasons.push("Email payeur manquant");
  }

  // Missing name
  if (!input.payerName) {
    score += 10;
    reasons.push("Nom payeur manquant");
  }

  // Empty description
  if (!input.description || input.description.trim().length < 3) {
    score += 5;
    reasons.push("Description vide ou trop courte");
  }

  // Very fast consent (< 3 seconds = bot or bypass)
  if (input.consentDurationMs && input.consentDurationMs < 3000) {
    score += 20;
    reasons.push("Consentement trop rapide (<3s)");
  }

  // Check previous failed payments from same email
  if (input.payerEmail) {
    const failedCount = await db.transaction.count({
      where: {
        payerEmail: input.payerEmail,
        status: "FAILED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (failedCount >= 3) {
      score += 25;
      reasons.push(`${failedCount} paiements échoués en 24h`);
    } else if (failedCount >= 1) {
      score += 10;
      reasons.push(`${failedCount} paiement(s) échoué(s) récent(s)`);
    }

    // Check if payer has had a dispute before
    const priorDisputes = await db.stripeDispute.count({
      where: {
        evidence: { payerEmail: input.payerEmail },
      },
    });
    if (priorDisputes > 0) {
      score += 30;
      reasons.push(`${priorDisputes} litige(s) antérieur(s) du même payeur`);
    }

    // Multiple payments in short time
    const recentPayments = await db.paymentEvidence.count({
      where: {
        payerEmail: input.payerEmail,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recentPayments >= 3) {
      score += 15;
      reasons.push(`${recentPayments} tentatives en 10 minutes`);
    }
  }

  // Suspicious user agent
  if (input.userAgent) {
    const ua = input.userAgent.toLowerCase();
    if (ua.includes("curl") || ua.includes("wget") || ua.includes("python") || ua.includes("bot")) {
      score += 20;
      reasons.push("User-Agent suspect (bot/script)");
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  let level: RiskLevel = "LOW";
  if (score > 75) level = "CRITICAL";
  else if (score > 50) level = "HIGH";
  else if (score > 25) level = "MEDIUM";

  return { score, level, reasons };
}

// ─── EVIDENCE SERVICE ───────────────────────────────────────────────────────

interface CreateEvidenceParams {
  stripePaymentIntentId?: string;
  payerEmail?: string;
  payerName?: string;
  amount: number;
  currency?: string;
  recipientAdminId: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  termsAccepted: boolean;
  refundPolicyAccepted: boolean;
  termsVersion?: string;
  refundPolicyVersion?: string;
  consentAt: Date;
}

export async function createPaymentEvidence(params: CreateEvidenceParams) {
  return db.paymentEvidence.create({
    data: {
      stripePaymentIntentId: params.stripePaymentIntentId,
      payerEmail: params.payerEmail,
      payerName: params.payerName,
      amount: params.amount,
      currency: params.currency || "EUR",
      recipientAdminId: params.recipientAdminId,
      description: params.description,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      termsAccepted: params.termsAccepted,
      refundPolicyAccepted: params.refundPolicyAccepted,
      termsVersion: params.termsVersion || "1.0",
      refundPolicyVersion: params.refundPolicyVersion || "1.0",
      consentAt: params.consentAt,
      paymentStatus: "pending",
    },
  });
}

export async function confirmEvidence(stripePaymentIntentId: string, chargeId?: string) {
  const evidence = await db.paymentEvidence.findUnique({
    where: { stripePaymentIntentId },
  });
  if (!evidence) return null;

  await db.paymentEvidence.update({
    where: { id: evidence.id },
    data: { paymentStatus: "succeeded", stripeChargeId: chargeId },
  });

  await db.paymentDeliveryProof.upsert({
    where: { paymentEvidenceId: evidence.id },
    create: {
      paymentEvidenceId: evidence.id,
      stripePaymentIntentId,
      stripeChargeId: chargeId,
      webhookConfirmed: true,
      deliveredAt: new Date(),
    },
    update: {
      webhookConfirmed: true,
      stripeChargeId: chargeId,
    },
  });

  return evidence;
}

export async function failEvidence(stripePaymentIntentId: string) {
  await db.paymentEvidence.updateMany({
    where: { stripePaymentIntentId },
    data: { paymentStatus: "failed" },
  });
}

// ─── DISPUTE SERVICE ────────────────────────────────────────────────────────

interface DisputeParams {
  stripeDisputeId: string;
  stripeChargeId: string;
  amount: number;
  currency?: string;
  reason?: string;
  status?: string;
  evidenceDueBy?: Date;
}

export async function handleDispute(params: DisputeParams) {
  // Find evidence by charge ID
  const evidence = await db.paymentEvidence.findFirst({
    where: { stripeChargeId: params.stripeChargeId },
  });

  const dispute = await db.stripeDispute.upsert({
    where: { stripeDisputeId: params.stripeDisputeId },
    create: {
      stripeDisputeId: params.stripeDisputeId,
      stripeChargeId: params.stripeChargeId,
      paymentEvidenceId: evidence?.id,
      amount: params.amount,
      currency: params.currency || "EUR",
      reason: params.reason,
      status: params.status || "needs_response",
      evidenceDueBy: params.evidenceDueBy,
    },
    update: {
      status: params.status,
      reason: params.reason,
    },
  });

  // Create critical alert
  await createAdminAlert({
    type: "DISPUTE_CREATED",
    severity: "CRITICAL",
    title: `Litige Stripe: ${(params.amount / 100).toFixed(2)}€`,
    message: `Litige ouvert (${params.reason || "inconnu"}) sur charge ${params.stripeChargeId}. Deadline: ${params.evidenceDueBy?.toLocaleDateString("fr-FR") || "N/A"}`,
    paymentEvidenceId: evidence?.id,
  });

  // Increase risk score of payer if identifiable
  if (evidence?.payerEmail) {
    const otherEvidences = await db.paymentEvidence.findMany({
      where: { payerEmail: evidence.payerEmail },
      select: { id: true },
    });
    for (const ev of otherEvidences) {
      await db.paymentRisk.updateMany({
        where: { paymentEvidenceId: ev.id },
        data: { score: 100, level: "CRITICAL" },
      });
    }
  }

  return dispute;
}

// ─── EVIDENCE EXPORT ────────────────────────────────────────────────────────

export async function generateEvidenceDossier(evidenceId: string) {
  const evidence = await db.paymentEvidence.findUnique({
    where: { id: evidenceId },
    include: {
      deliveryProof: true,
      risk: true,
      dispute: true,
    },
  });

  if (!evidence) return null;

  return {
    payment: {
      id: evidence.id,
      amount: evidence.amount,
      currency: evidence.currency,
      description: evidence.description,
      recipientAdminId: evidence.recipientAdminId,
      status: evidence.paymentStatus,
      createdAt: evidence.createdAt,
    },
    payer: {
      email: evidence.payerEmail,
      name: evidence.payerName,
      ipAddress: evidence.ipAddress,
      userAgent: evidence.userAgent,
    },
    consent: {
      termsAccepted: evidence.termsAccepted,
      refundPolicyAccepted: evidence.refundPolicyAccepted,
      termsVersion: evidence.termsVersion,
      refundPolicyVersion: evidence.refundPolicyVersion,
      consentAt: evidence.consentAt,
    },
    stripe: {
      paymentIntentId: evidence.stripePaymentIntentId,
      chargeId: evidence.stripeChargeId,
    },
    delivery: evidence.deliveryProof
      ? {
          webhookConfirmed: evidence.deliveryProof.webhookConfirmed,
          successPageViewed: evidence.deliveryProof.successPageViewed,
          receiptSent: evidence.deliveryProof.receiptSent,
          deliveredAt: evidence.deliveryProof.deliveredAt,
        }
      : null,
    risk: evidence.risk
      ? {
          score: evidence.risk.score,
          level: evidence.risk.level,
          reasons: evidence.risk.reasons,
        }
      : null,
    dispute: evidence.dispute
      ? {
          stripeDisputeId: evidence.dispute.stripeDisputeId,
          reason: evidence.dispute.reason,
          status: evidence.dispute.status,
          evidenceDueBy: evidence.dispute.evidenceDueBy,
        }
      : null,
  };
}

// ─── ADMIN ALERTS ───────────────────────────────────────────────────────────

interface AlertParams {
  type: string;
  severity: string;
  title: string;
  message: string;
  paymentEvidenceId?: string;
}

export async function createAdminAlert(params: AlertParams) {
  return db.adminAlert.create({
    data: {
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      paymentEvidenceId: params.paymentEvidenceId,
    },
  });
}
