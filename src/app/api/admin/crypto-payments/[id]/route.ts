import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { reviewCryptoPaymentSchema } from "@/lib/validators";
import { createActivationKey } from "@/lib/services/crypto-access";
import { createNotification } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

// Traitement d'une demande de paiement par l'admin.
//   action=confirm → statut RECEIVED + génération d'une clé d'activation liée
//                     au compte et au paiement, puis notification de l'utilisateur.
//   action=reject  → statut REJECTED (+ note optionnelle).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { action, note } = reviewCryptoPaymentSchema.parse(body);

    const payment = await db.cryptoPayment.findUnique({
      where: { id },
      include: { activationKey: { select: { id: true, key: true, status: true } } },
    });
    if (!payment) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    if (action === "reject") {
      const updated = await db.cryptoPayment.update({
        where: { id },
        data: { status: "REJECTED", note: note ?? null, reviewedBy: admin.userId, reviewedAt: new Date() },
        select: { id: true, status: true, note: true },
      });

      await db.auditLog.create({
        data: { userId: admin.userId, action: "CRYPTO_PAYMENT_REJECTED", target: id, metadata: { note } },
      });

      await createNotification({
        userId: payment.userId,
        type: "PAYMENT_RECEIVED",
        title: "Paiement non validé",
        body: note || "Votre paiement n'a pas pu être vérifié. Contactez le support.",
        href: "/access/crypto",
      });

      return NextResponse.json({ payment: updated });
    }

    // action === "confirm"
    if (payment.status === "REJECTED") {
      return NextResponse.json({ error: "Ce paiement a été rejeté. Réinitialisez-le d'abord." }, { status: 400 });
    }

    // Réémission impossible : si une clé existe déjà pour ce paiement, on la renvoie.
    if (payment.activationKey) {
      return NextResponse.json({
        payment: { id: payment.id, status: "RECEIVED" },
        key: payment.activationKey.key,
        alreadyIssued: true,
      });
    }

    const planForKey = payment.plan === "BUSINESS" ? "BUSINESS" : "PRO";
    const key = await createActivationKey({
      plan: planForKey,
      createdBy: admin.userId,
      userId: payment.userId,
      cryptoPaymentId: payment.id,
      note: `Paiement LTC ${planForKey} ${payment.txid.slice(0, 12)}…`,
      ipAddress: ip,
      userAgent,
    });

    const updated = await db.cryptoPayment.update({
      where: { id },
      data: { status: "RECEIVED", note: note ?? payment.note, reviewedBy: admin.userId, reviewedAt: new Date() },
      select: { id: true, status: true },
    });

    await db.auditLog.create({
      data: {
        userId: admin.userId,
        action: "CRYPTO_PAYMENT_CONFIRMED",
        target: id,
        metadata: { keyId: key.id, txid: payment.txid },
      },
    });

    await createNotification({
      userId: payment.userId,
      type: "PAYMENT_RECEIVED",
      title: `Paiement reçu — clé ${planForKey} disponible`,
      body: `Votre paiement est confirmé. Saisissez votre clé d'activation pour passer en plan ${planForKey === "BUSINESS" ? "Business" : "Pro"}.`,
      href: "/access/activate",
    });

    return NextResponse.json({ payment: updated, key: key.key, plan: planForKey });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("CRYPTO_REVIEW_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
