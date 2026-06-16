import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveAccess } from "@/lib/auth/access";
import { getAccountStatus } from "@/lib/services/stripe-connect";

export const dynamic = "force-dynamic";

/**
 * Resynchronise le compte Connect depuis Stripe (appelé au retour de
 * l'onboarding, avant même l'arrivée du webhook account.updated).
 * Met à jour les champs Connect du user et crée/maj le compte bancaire local
 * reflétant l'IBAN saisi côté Stripe (pour que les retraits le retrouvent).
 */
export async function GET() {
  try {
    const access = await requireActiveAccess();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const user = await db.user.findUnique({ where: { id: access.userId } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    if (!user.stripeAccountId) {
      return NextResponse.json({ connectStatus: "not_created", payoutsEnabled: false });
    }

    const status = await getAccountStatus(user.stripeAccountId);
    const ext = status.externalAccount;

    await db.user.update({
      where: { id: user.id },
      data: {
        payoutsEnabled: status.payoutsEnabled,
        stripeOnboarded: status.detailsSubmitted,
        stripeChargesEnabled: status.chargesEnabled,
        stripeDetailsSubmitted: status.detailsSubmitted,
        stripeConnectStatus: status.connectStatus,
        payoutsDisabledReason: status.disabledReason,
        stripeCountry: status.country || undefined,
        stripeDefaultCurrency: status.defaultCurrency || undefined,
        ...(ext && {
          bankAccountLast4: ext.last4,
          bankAccountCountry: ext.country,
          bankAccountCurrency: ext.currency,
        }),
      },
    });

    // Reflète l'IBAN (géré par Stripe) en local pour que /api/payouts/create le
    // retrouve. On ne stocke jamais l'IBAN complet — seulement les 4 derniers.
    if (ext?.id) {
      await db.bankAccount.upsert({
        where: { providerBankAccountId: ext.id },
        create: {
          userId: user.id,
          providerBankAccountId: ext.id,
          ibanMasked: ext.last4 ? `•••• ${ext.last4}` : "••••",
          holderName: ext.holderName || user.name || "Titulaire",
          bankName: ext.bankName || null,
          country: ext.country || "FR",
          currency: (ext.currency || "EUR").toUpperCase(),
          status: "VERIFIED",
          isDefault: true,
        },
        update: {
          status: "VERIFIED",
          bankName: ext.bankName || undefined,
        },
      });
    }

    return NextResponse.json({
      connectStatus: status.connectStatus,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      disabledReason: status.disabledReason,
      currentlyDue: status.currentlyDue,
    });
  } catch (e: any) {
    console.error("CONNECT_STATUS:", e?.message || e);
    return NextResponse.json({ error: "Erreur récupération statut" }, { status: 500 });
  }
}
