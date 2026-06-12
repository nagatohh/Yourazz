import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Lock,
  Shield,
  CreditCard,
  CheckCircle,
  Calendar,
  UserX,
  ArrowRight,
  LinkIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

// cache() : generateMetadata et la page partagent la même requête DB
// au lieu d'en faire deux identiques par visite.
const getProfile = cache(async (username: string) => {
  try {
    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        createdAt: true,
        paymentLinks: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { slug: true, label: true, fixedAmount: true },
        },
        _count: {
          select: { transactions: { where: { type: "PAYIN", status: "SUCCEEDED" } } },
        },
      },
    });
    if (!user || user.status !== "ACTIVE") return null;
    return user;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: "Profil introuvable" };
  return {
    title: `@${profile.username} – Yourazz`,
    description: `Payez ${profile.name ?? `@${profile.username}`} en toute sécurité par carte bancaire, Apple Pay ou Google Pay.`,
    robots: { index: false },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4">
        <Card className="max-w-md p-8 text-center border-white/[0.08]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <UserX className="h-5 w-5 text-zinc-500" />
          </div>
          <CardTitle>Profil introuvable</CardTitle>
          <CardDescription className="mt-2">
            Ce profil n&apos;existe pas ou n&apos;est plus disponible.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const displayName = profile.name ?? `@${profile.username}`;
  const completedPayments = profile._count.transactions;
  const memberDate = new Date(profile.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const initials = displayName
    .replace("@", "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4 py-6 sm:py-10">
      {/* Halo de fond statique — radial-gradient au lieu de blur() :
          même rendu, zéro coût GPU sur mobile */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.07),transparent_65%)]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* En-tête profil */}
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full gradient-brand shadow-xl shadow-brand-500/20 ring-4 ring-white/[0.05] sm:mb-4 sm:h-24 sm:w-24">
            <span className="text-2xl font-bold text-white sm:text-3xl">{initials}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{displayName}</h1>
          {profile.username && <p className="mt-0.5 text-sm text-zinc-500">@{profile.username}</p>}

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

        {/* Liens de paiement */}
        {profile.paymentLinks.length === 0 ? (
          <Card className="border-white/[0.08] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <LinkIcon className="h-5 w-5 text-zinc-500" />
            </div>
            <CardTitle>Aucun lien actif</CardTitle>
            <CardDescription className="mt-2">
              {displayName} n&apos;a pas de lien de paiement actif pour le moment.
            </CardDescription>
          </Card>
        ) : (
          <div className="space-y-3">
            {profile.paymentLinks.map((link) => (
              <Link key={link.slug} href={`/pay/${link.slug}`} className="block group">
                <Card className="border-white/[0.08] p-5 transition-all group-hover:border-brand-500/30 group-hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{link.label}</p>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {link.fixedAmount ? fmt(link.fixedAmount) : "Montant libre"}
                      </p>
                    </div>
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 transition-all group-hover:bg-brand-500/20 group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pied de confiance */}
        <div className="mt-6 text-center sm:mt-8">
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
            Paiements sécurisés propulsés par <span className="text-zinc-500">Yourazz</span> — les données
            bancaires ne sont jamais stockées.
          </p>
        </div>
      </div>
    </div>
  );
}
