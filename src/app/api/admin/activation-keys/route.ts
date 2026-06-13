import { NextResponse } from "next/server";
import { ActivationKeyStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { generateKeySchema } from "@/lib/validators";
import { createActivationKey } from "@/lib/services/crypto-access";
import { createNotification } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

// Liste des clés d'activation (sans exposer le hash).
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const valid = ["ACTIVE", "USED", "SUSPENDED", "EXPIRED", "REVOKED"];
  const where = valid.includes(status ?? "") ? { status: status as ActivationKeyStatus } : {};

  const keys = await db.activationKey.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      key: true,
      plan: true,
      status: true,
      note: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      createdAt: true,
      cryptoPaymentId: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ keys });
}

// Génération manuelle d'une clé. La clé peut être liée à un compte (par userId
// ou email) — recommandé : une clé est personnelle et non transférable.
export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = await req.json();
    const { plan, userId, email, cryptoPaymentId, expiresInDays, note } = generateKeySchema.parse(body);

    let targetUserId: string | null = userId ?? null;
    if (!targetUserId && email) {
      const user = await db.user.findUnique({ where: { email }, select: { id: true } });
      if (!user) return NextResponse.json({ error: "Aucun compte avec cet email" }, { status: 404 });
      targetUserId = user.id;
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    const key = await createActivationKey({
      plan,
      createdBy: admin.userId,
      userId: targetUserId,
      cryptoPaymentId: cryptoPaymentId ?? null,
      expiresInDays: expiresInDays ?? null,
      note: note ?? null,
      ipAddress: ip,
      userAgent,
    });

    await db.auditLog.create({
      data: {
        userId: admin.userId,
        action: "ACTIVATION_KEY_GENERATED",
        target: key.id,
        metadata: { plan, targetUserId, cryptoPaymentId, expiresInDays },
      },
    });

    if (targetUserId) {
      const planName = plan === "BUSINESS" ? "Business" : "Pro";
      await createNotification({
        userId: targetUserId,
        type: "PAYMENT_RECEIVED",
        title: `Clé ${planName} disponible`,
        body: `Une clé d'activation ${planName} a été émise pour votre compte. Saisissez-la pour activer votre plan.`,
        href: "/access/activate",
      });
    }

    return NextResponse.json({
      key: {
        id: key.id,
        key: key.key,
        plan: key.plan,
        status: key.status,
        userId: key.userId,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      },
    });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("KEY_GENERATE_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
