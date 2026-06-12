import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOpenBankingProvider } from "@/lib/payments";
import { openBankingCreateSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = rateLimit(`open-banking:${ip}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

    const body = await req.json();
    const v = openBankingCreateSchema.parse(body);

    const receiver = await db.user.findUnique({ where: { id: v.receiverId }, include: { wallet: true } });
    if (!receiver?.wallet) return NextResponse.json({ error: "Bénéficiaire introuvable" }, { status: 404 });
    if (receiver.status !== "ACTIVE") {
      return NextResponse.json({ error: "Ce bénéficiaire ne peut pas recevoir de paiements actuellement" }, { status: 403 });
    }

    const { checkPlanCap } = await import("@/lib/services/plans");
    const capCheck = await checkPlanCap(receiver, v.amount);
    if (!capCheck.allowed) {
      return NextResponse.json(
        { error: "Le bénéficiaire a atteint son plafond mensuel d'encaissement." },
        { status: 403 }
      );
    }

    const provider = getOpenBankingProvider();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const result = await provider.initPayment({
      amount: v.amount,
      payerName: v.payerName,
      payerEmail: v.payerEmail,
      bankId: v.bankId,
      redirectUrl: `${baseUrl}/api/payments/open-banking/callback`,
      reference: `yourazz_${receiver.id}_${Date.now()}`,
      metadata: { receiverId: receiver.id },
    });

    if (result.status === "failed") {
      return NextResponse.json({ error: "Échec de l'initiation du paiement bancaire" }, { status: 502 });
    }

    await db.openBankingSession.create({
      data: {
        userId: receiver.id,
        providerSessionId: result.sessionId,
        bankId: v.bankId,
        amount: v.amount,
        payerEmail: v.payerEmail,
        payerName: v.payerName,
        status: "INITIATED",
        redirectUrl: result.authorizationUrl,
        expiresAt: result.expiresAt,
      },
    });

    return NextResponse.json({
      authorizationUrl: result.authorizationUrl,
      sessionId: result.sessionId,
    });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    console.error("OPEN_BANKING_CREATE:", e);
    return NextResponse.json({ error: "Erreur paiement bancaire" }, { status: 500 });
  }
}
