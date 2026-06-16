import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveAccess } from "@/lib/auth/access";
import { createConnectedAccount, createAccountSession } from "@/lib/services/stripe-connect";

export const dynamic = "force-dynamic";

/**
 * Renvoie un client_secret d'Account Session pour l'onboarding embarqué Stripe.
 * Crée le compte Express si le vendeur n'en a pas encore. Aucune donnée bancaire
 * ne transite par Yourazz : le composant <ConnectAccountOnboarding/> côté client
 * dialogue directement avec Stripe via ce secret.
 */
export async function POST() {
  try {
    const access = await requireActiveAccess();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const user = await db.user.findUnique({ where: { id: access.userId } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    let stripeAccountId = user.stripeAccountId;

    if (!stripeAccountId) {
      const result = await createConnectedAccount({
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
      });
      stripeAccountId = result.stripeAccountId;

      await db.user.update({
        where: { id: user.id },
        data: { stripeAccountId, stripeConnectStatus: "pending_onboarding" },
      });
      await db.auditLog.create({
        data: { userId: user.id, action: "CONNECT_ACCOUNT_CREATED", target: stripeAccountId },
      });
    }

    const { clientSecret } = await createAccountSession(stripeAccountId);
    return NextResponse.json({ clientSecret });
  } catch (e: any) {
    const stripeMsg = e?.raw?.message || e?.message;
    console.error("CONNECT_ACCOUNT_SESSION:", e?.type, e?.code, stripeMsg);
    return NextResponse.json(
      { error: "Impossible de démarrer la vérification pour le moment. Réessayez plus tard." },
      { status: 502 },
    );
  }
}
