import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveAccess } from "@/lib/auth/access";
import { createConnectedAccount, createAccountLink } from "@/lib/services/stripe-connect";

export const dynamic = "force-dynamic";

/**
 * Démarre (ou reprend) l'onboarding Stripe Express du vendeur.
 * Crée le compte connecté s'il n'existe pas, puis renvoie un account link
 * hébergé par Stripe. Aucune donnée bancaire ne transite par Yourazz.
 */
export async function POST(req: Request) {
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

    const base = process.env.NEXT_PUBLIC_APP_URL || "https://yourazz.xyz";
    const { url } = await createAccountLink({
      stripeAccountId,
      // refresh_url : lien expiré/abandonné → on relance l'onboarding
      refreshUrl: `${base}/dashboard/bank-account?onboarding=refresh`,
      // return_url : retour après soumission → la page resync le statut
      returnUrl: `${base}/dashboard/bank-account?onboarding=return`,
    });

    await db.auditLog.create({
      data: { userId: user.id, action: "CONNECT_ONBOARDING_STARTED", target: stripeAccountId },
    });

    return NextResponse.json({ url });
  } catch (e: any) {
    // Erreur réelle conservée côté serveur (logs), message propre côté client.
    const stripeMsg = e?.raw?.message || e?.message || "erreur inconnue";
    const code = e?.code || e?.raw?.code;
    console.error("CONNECT_ONBOARD:", e?.type, code, stripeMsg);
    return NextResponse.json(
      { error: "Impossible de démarrer la connexion bancaire pour le moment. Réessayez plus tard." },
      { status: 502 },
    );
  }
}
