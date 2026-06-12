import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireActiveAccess } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { z } from "zod";
import { maskIban } from "@/lib/utils";
import { addExternalBankAccount, createConnectedAccount } from "@/lib/services/stripe-connect";

export const dynamic = "force-dynamic";

const addBankAccountSchema = z.object({
  iban: z.string().min(15).max(34).regex(/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/i, "Format IBAN invalide"),
  holderName: z.string().min(2).max(100),
  country: z.string().length(2).default("FR"),
  currency: z.string().length(3).default("EUR"),
});

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const accounts = await db.bankAccount.findMany({
    where: { userId: s.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ibanMasked: true,
      holderName: true,
      bankName: true,
      country: true,
      currency: true,
      status: true,
      isDefault: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  try {
    const access = await requireActiveAccess();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();
    const v = addBankAccountSchema.parse(body);

    const user = await db.user.findUnique({ where: { id: access.userId } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    let stripeAccountId = user.stripeAccountId;

    if (!stripeAccountId) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
      const result = await createConnectedAccount({
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
        tosAcceptanceIp: ip,
      });
      stripeAccountId = result.stripeAccountId;

      await db.user.update({
        where: { id: user.id },
        data: { stripeAccountId },
      });
    }

    const stripeResult = await addExternalBankAccount({
      stripeAccountId,
      iban: v.iban,
      holderName: v.holderName,
      country: v.country.toUpperCase(),
      currency: v.currency.toLowerCase(),
    });

    const account = await db.bankAccount.create({
      data: {
        userId: user.id,
        ibanMasked: maskIban(v.iban),
        holderName: v.holderName,
        country: v.country.toUpperCase(),
        currency: v.currency.toUpperCase(),
        bankName: stripeResult.bankName,
        status: "VERIFIED",
        isDefault: true,
        providerBankAccountId: stripeResult.externalAccountId,
      },
    });

    await db.bankAccount.updateMany({
      where: { userId: user.id, id: { not: account.id } },
      data: { isDefault: false },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "BANK_ACCOUNT_ADDED",
        target: account.id,
        metadata: { country: v.country, currency: v.currency, last4: stripeResult.last4 },
      },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        ibanMasked: account.ibanMasked,
        holderName: account.holderName,
        bankName: account.bankName,
        country: account.country,
        currency: account.currency,
        status: account.status,
        isDefault: account.isDefault,
      },
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: "Données invalides. Vérifiez l'IBAN et le nom du titulaire." }, { status: 400 });
    }
    if (e?.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: e.message || "Erreur Stripe lors de l'ajout du compte bancaire" }, { status: 400 });
    }
    console.error("BANK_ACCOUNT_CREATE:", e?.message || e);
    return NextResponse.json({ error: "Erreur lors de l'ajout du compte bancaire" }, { status: 500 });
  }
}
