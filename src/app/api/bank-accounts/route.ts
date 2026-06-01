import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { addBankAccountSchema } from "@/lib/validators";
import { maskIban } from "@/lib/utils";
import { encrypt } from "@/lib/crypto";
import { getPaymentProvider } from "@/lib/payments";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const accounts = await db.bankAccount.findMany({ where: { userId: s.userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const v = addBankAccountSchema.parse(await req.json());

    const provider = getPaymentProvider();
    const result = await provider.registerBankAccount({
      userId: s.userId,
      iban: v.iban,
      holderName: v.holderName,
      bic: v.bic,
      country: v.country || "FR",
    });

    const account = await db.bankAccount.create({
      data: {
        userId: s.userId,
        ibanMasked: maskIban(v.iban),
        ibanEncrypted: encrypt(v.iban),
        bic: v.bic,
        holderName: v.holderName,
        status: "VERIFIED",
        isDefault: true,
        providerBankAccountId: result.providerBankId,
      },
    });

    await db.bankAccount.updateMany({ where: { userId: s.userId, id: { not: account.id } }, data: { isDefault: false } });

    return NextResponse.json({ account });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: "IBAN invalide" }, { status: 400 });
    console.error("BANK_ACCOUNT_CREATE:", e);
    return NextResponse.json({ error: "Erreur lors de l'ajout du compte" }, { status: 500 });
  }
}
