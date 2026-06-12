import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Shield, CreditCard, CheckCircle, Calendar, LinkIcon } from "lucide-react";
import { PayFlow } from "@/components/checkout/pay-flow";
import { ApplePayLogo, GooglePayLogo, MastercardLogo, VisaLogo } from "@/components/ui/payment-logos";

export const dynamic = "force-dynamic";

// cache() : generateMetadata et la page partagent la même requête DB
// au lieu d'en faire deux identiques par visite.
const getLink = cache(async (slug: string) => {
  try {
    const link = await db.paymentLink.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            status: true,
            accessStatus: true,
            createdAt: true,
            _count: {
              select: { transactions: { where: { type: "PAYIN", status: "SUCCEEDED" } } },
            },
          },
        },
      },
    });
    if (!link || !link.isActive) return null;
    // Le propriétaire doit avoir un abonnement actif pour encaisser (sauf admin)
    const ownerIsAdmin = link.user.role === "ADMIN" || link.user.role === "ADMIN_OWNER";
    if (link.user.status !== "ACTIVE" || (!ownerIsAdmin && link.user.accessStatus !== "ACTIVE")) return null;
    return link;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const link = await getLink(slug);
  if (!link) return { title: "Lien introuvable" };
  return {
    title: `Payer ${link.user.name ?? "via Yourazz"}`,
    description: "Paiement sécurisé par carte bancaire, Apple Pay ou Google Pay.",
    robots: { index: false },
  };
}

export default async function PublicPayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await getLink(slug);

  if (!link) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4">
        <Card className="max-w-md p-8 text-center border-white/[0.08]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <LinkIcon className="h-5 w-5 text-zinc-500" />
          </div>
          <CardTitle>Lien introuvable</CardTitle>
          <CardDescription className="mt-2">
            Ce lien de paiement n&apos;existe pas ou a été désactivé par son propriétaire.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const recipientName = link.user.name ?? "Bénéficiaire Yourazz";
  const completedPayments = link.user._count.transactions;
  const memberDate = new Date(link.user.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const initials = recipientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4 py-6 sm:py-10">
      {/* Connexions Stripe ouvertes dès le premier octet — React hisse ces
          balises dans <head>. Le TLS handshake est déjà fait quand le payeur
          arrive à l'étape carte. */}
      <link rel="preconnect" href="https://js.stripe.com" />
      <link rel="preconnect" href="https://api.stripe.com" />
      <link rel="dns-prefetch" href="https://hooks.stripe.com" />

      {/* Halo de fond statique — radial-gradient au lieu de blur() :
          même rendu, zéro coût GPU sur mobile */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.07),transparent_65%)]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* En-tête bénéficiaire */}
        <div className="mb-5 text-center sm:mb-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full gradient-brand shadow-xl shadow-brand-500/20 ring-4 ring-white/[0.05] sm:mb-4 sm:h-20 sm:w-20">
            <span className="text-xl font-bold text-white sm:text-2xl">{initials}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{recipientName}</h1>
          {link.user.username && <p className="mt-0.5 text-sm text-zinc-500">@{link.user.username}</p>}

          <div className="mt-4 flex items-center justify-center gap-4">
            {completedPayments > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {completedPayments} paiement{completedPayments > 1 ? "s" : ""} reçu
                  {completedPayments > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>Membre depuis {memberDate}</span>
            </div>
          </div>
        </div>

        {/* Carte de paiement */}
        <Card className="border-white/[0.08] p-5 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-sm text-zinc-400">{link.label}</p>
            {link.fixedAmount && (
              <p className="mt-3 text-4xl font-bold tracking-tight text-white">
                {(link.fixedAmount / 100).toFixed(2)} <span className="text-lg text-zinc-500">EUR</span>
              </p>
            )}
          </div>

          <PayFlow
            link={{
              id: link.id,
              slug: link.slug,
              label: link.label,
              fixedAmount: link.fixedAmount,
              userId: link.userId,
              recipientName,
            }}
          />
        </Card>

        {/* Pied de confiance */}
        <div className="mt-5 text-center sm:mt-6">
          <div className="mb-4 flex items-center justify-center gap-1.5">
            <VisaLogo className="h-7 px-2" />
            <MastercardLogo className="h-7 px-2" />
            <ApplePayLogo className="h-7 px-2" />
            <GooglePayLogo className="h-7 px-2" />
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-600 sm:gap-6 sm:text-[11px]">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Chiffré SSL
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> 3D Secure
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Stripe
            </span>
          </div>
          <p className="mt-2.5 text-[10px] text-zinc-700 sm:text-[11px]">
            Paiement sécurisé propulsé par <span className="text-zinc-500">Yourazz</span> — vos données
            bancaires ne sont jamais stockées.
          </p>
        </div>
      </div>
    </div>
  );
}
