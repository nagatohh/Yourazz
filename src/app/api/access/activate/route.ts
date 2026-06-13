import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { activateKeySchema } from "@/lib/validators";
import { redeemActivationKey } from "@/lib/services/crypto-access";
import { createNotification } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

// Validation d'une clé d'activation. Si valide et non utilisée, débloque
// l'accès (accessStatus → ACTIVE). Usage unique garanti côté service.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || null;

    // Rate-limit strict : bloque le brute-force de clés.
    const { allowed } = rateLimit(`activate:${session.userId}:${ip}`, 8, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une minute." }, { status: 429 });
    }

    const body = await req.json();
    const { key } = activateKeySchema.parse(body);

    const result = await redeemActivationKey({
      rawKey: key,
      userId: session.userId,
      ipAddress: ip,
      userAgent,
    });

    if (!result.ok) {
      // Trace côté journal de sécurité (tentative échouée).
      await db.securityLog.create({
        data: {
          userId: session.userId,
          action: "ACTIVATION_KEY_FAILED",
          ipAddress: ip,
          userAgent,
          severity: "WARNING",
          metadata: { code: result.code },
        },
      });
      return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
    }

    const planName = result.plan === "BUSINESS" ? "Business" : "Pro";

    await db.securityLog.create({
      data: {
        userId: session.userId,
        action: "ACTIVATION_KEY_REDEEMED",
        ipAddress: ip,
        userAgent,
        severity: "INFO",
        metadata: { keyId: result.keyId, plan: result.plan },
      },
    });

    await createNotification({
      userId: session.userId,
      type: "PAYMENT_RECEIVED",
      title: `Plan ${planName} activé`,
      body: `Votre clé est valide. Votre compte est maintenant en plan ${planName}.`,
      href: "/dashboard/plan",
    });

    return NextResponse.json({ ok: true, plan: result.plan });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Clé d'activation invalide." }, { status: 400 });
    }
    console.error("ACTIVATE_ERROR:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
