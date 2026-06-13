import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { submitCryptoPaymentSchema } from "@/lib/validators";
import { getCryptoAccessConfig, normalizeTxid } from "@/lib/services/crypto-access";

export const dynamic = "force-dynamic";

// Soumission du TXID après paiement LTC. Crée une demande de vérification
// (statut PENDING) que l'admin traitera. Ne débloque aucun accès.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || null;

    const { allowed } = rateLimit(`crypto-submit:${session.userId}:${ip}`, 5, 60_000);
    if (!allowed) return NextResponse.json({ error: "Trop de tentatives, réessayez dans une minute." }, { status: 429 });

    const body = await req.json();
    const parsed = submitCryptoPaymentSchema.parse(body);
    const txid = normalizeTxid(parsed.txid);
    const amount = parsed.amount ? parsed.amount : null;

    const cfg = getCryptoAccessConfig();
    if (!cfg.configured) {
      return NextResponse.json({ error: "Le paiement crypto n'est pas encore configuré." }, { status: 503 });
    }

    // Anti-rejeu : un même TXID ne peut être soumis qu'une fois (toutes
    // soumissions confondues), ce qui empêche deux comptes de revendiquer le
    // même paiement.
    const existing = await db.cryptoPayment.findUnique({
      where: { currency_txid: { currency: "LTC", txid } },
      select: { id: true, userId: true, status: true },
    });
    if (existing) {
      const mine = existing.userId === session.userId;
      return NextResponse.json(
        {
          error: mine
            ? "Vous avez déjà soumis ce TXID. Son statut est consultable ci-dessous."
            : "Ce TXID a déjà été soumis.",
        },
        { status: 409 },
      );
    }

    const payment = await db.cryptoPayment.create({
      data: {
        userId: session.userId,
        currency: "LTC",
        address: cfg.address,
        txid,
        amount,
        ipAddress: ip,
        userAgent,
      },
      select: { id: true, status: true, txid: true, amount: true, createdAt: true },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CRYPTO_PAYMENT_SUBMITTED",
        target: payment.id,
        metadata: { txid, amount, currency: "LTC" },
      },
    });

    return NextResponse.json({ payment });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      const issue = (e as { issues?: { message: string }[] }).issues?.[0];
      return NextResponse.json({ error: issue?.message || "Données invalides" }, { status: 400 });
    }
    console.error("CRYPTO_SUBMIT_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Historique des soumissions de l'utilisateur connecté (pour affichage du statut).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const payments = await db.cryptoPayment.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      txid: true,
      amount: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      activationKey: { select: { status: true } },
    },
  });

  return NextResponse.json({ payments });
}
