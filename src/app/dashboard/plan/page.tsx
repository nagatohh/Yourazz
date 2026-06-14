"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Gem, TrendingUp, ExternalLink, AlertCircle, CreditCard, Bitcoin, KeyRound, Lock } from "lucide-react";
import { FEATURE_LABEL, minPlanForFeature, type Feature } from "@/lib/services/permissions";
import { PlanBadge } from "@/components/dashboard/premium-gate";

type Tier = "STARTER" | "PRO" | "BUSINESS";

interface PlanRow {
  tier: Tier;
  name: string;
  price: number;
  monthlyCap: number | null;
  accent: "zinc" | "brand" | "amber";
  tagline: string;
  requiresKey: boolean;
  benefits: string[];
  ltcAmount: string;
}

interface PlanInfo {
  plan: Tier;
  isAdmin: boolean;
  monthlyUsed: number;
  monthlyCap: number | null;
  subscription: { status: string; currentPeriodEnd: string | null; canceledAt: string | null } | null;
  permissions: Record<string, boolean>;
  plans: PlanRow[];
}

const ACCENT: Record<PlanRow["accent"], { icon: string; ring: string; chip: string; bar: string; glow: string }> = {
  zinc: { icon: "text-zinc-400", ring: "border-white/[0.06]", chip: "bg-white/[0.05] text-zinc-300", bar: "bg-zinc-500", glow: "" },
  brand: { icon: "text-brand-400", ring: "border-brand-500/25", chip: "bg-brand-500/10 text-brand-400", bar: "gradient-brand", glow: "bg-gradient-to-br from-brand-500/[0.06] to-transparent" },
  amber: { icon: "text-amber-400", ring: "border-amber-500/25", chip: "bg-amber-500/10 text-amber-400", bar: "bg-amber-500", glow: "bg-gradient-to-br from-amber-500/[0.06] to-transparent" },
};

export default function PlanPage() {
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("upgraded")) {
      setUpgraded(true);
    }
    apiFetch("/api/plans")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setInfo(d); })
      .catch(() => {});
  }, []);

  const fmt = (cents: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);

  const payStripe = async (tier: string) => {
    setError("");
    setLoading(`stripe-${tier}`);
    try {
      const res = await apiFetch("/api/plans/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ? `${data.error} (${data.detail})` : data.error || "Erreur"); return; }
      if (data.url) { window.location.href = data.url; return; }
      window.location.href = "/dashboard/plan?upgraded=1";
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setError("");
    setLoading("portal");
    try {
      const res = await apiFetch("/api/plans/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(null);
    }
  };

  if (!info) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const usagePct = info.monthlyCap ? Math.min(100, Math.round((info.monthlyUsed / info.monthlyCap) * 100)) : null;
  const currentName = info.plans.find((p) => p.tier === info.plan)?.name;
  const lockedFeatures = (Object.keys(info.permissions) as Feature[]).filter(
    (f) => !info.permissions[f] && minPlanForFeature(f) !== "STARTER"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Abonnement</h1>
          <p className="text-sm text-zinc-500 mt-1">Choisissez votre plan — payez par carte ou en Litecoin</p>
        </div>
        <Link href="/access/activate">
          <Button variant="outline" size="sm"><KeyRound className="h-4 w-4" /> J&apos;ai une clé</Button>
        </Link>
      </div>

      {upgraded && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
          <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-400">
            Paiement reçu — votre plan sera mis à jour d&apos;ici quelques secondes (confirmation Stripe).
          </p>
        </div>
      )}

      {/* Utilisation du mois */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-500/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <CardTitle className="text-base">Encaissé ce mois-ci</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {info.isAdmin
                  ? "Compte administrateur — aucun plafond"
                  : info.monthlyCap
                    ? `Plafond du plan ${currentName} : ${fmt(info.monthlyCap)}/mois`
                    : "Encaissement illimité"}
              </CardDescription>
            </div>
          </div>
          <p className="text-xl font-bold text-white">{fmt(info.monthlyUsed)}</p>
        </div>
        {usagePct !== null && (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={`h-full rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "gradient-brand"}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {usagePct}% utilisé{usagePct >= 90 && " — passez au plan supérieur pour ne pas refuser de paiements"}
            </p>
          </>
        )}
      </Card>

      {/* Fonctionnalités verrouillées avec le plan actuel */}
      {!info.isAdmin && lockedFeatures.length > 0 && (
        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-white/[0.04] p-2.5">
              <Lock className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-base">Fonctionnalités verrouillées</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {info.plan === "STARTER"
                  ? "Vous utilisez le plan Starter gratuit. Passez à Pro ou Business pour les débloquer."
                  : "Passez au plan supérieur pour débloquer ces fonctionnalités."}
              </CardDescription>
            </div>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lockedFeatures.map((f) => (
              <li key={f} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <span className="flex items-center gap-2 text-[13px] text-zinc-400">
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-zinc-600" />
                  {FEATURE_LABEL[f]}
                </span>
                <PlanBadge tier={minPlanForFeature(f) as "PRO" | "BUSINESS"} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Grille des plans */}
      <div className="grid gap-4 lg:grid-cols-3">
        {info.plans.map((p) => {
          const a = ACCENT[p.accent];
          const isCurrent = p.tier === info.plan;
          const isPaid = p.tier !== "STARTER";
          return (
            <Card key={p.tier} className={`relative flex flex-col p-5 sm:p-6 ${a.ring} ${a.glow}`}>
              {p.tier === "PRO" && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full gradient-brand px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Populaire
                </span>
              )}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gem className={`h-4 w-4 ${a.icon}`} />
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${a.chip}`}>{p.tier}</span>
                </div>
                {isCurrent && <Badge variant="success">Actuel</Badge>}
              </div>

              <p className="mb-0.5 text-3xl font-bold tracking-tight text-white">
                {p.price === 0 ? "Gratuit" : `${(p.price / 100).toFixed(2).replace(".", ",")} €`}
                {p.price > 0 && <span className="text-sm font-normal text-zinc-500"> /mois</span>}
              </p>
              <p className="mb-1 text-xs text-zinc-500">{p.tagline}</p>
              {isPaid && p.ltcAmount && (
                <p className="mb-4 flex items-center gap-1 text-[11px] text-zinc-500">
                  <Bitcoin className="h-3 w-3 text-amber-400" /> ou {p.ltcAmount} LTC en crypto
                </p>
              )}
              {(!isPaid || !p.ltcAmount) && <div className="mb-4" />}

              <ul className="mb-6 flex-1 space-y-2.5">
                {p.benefits.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-zinc-400">
                    <Check className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${a.icon}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {!isPaid ? (
                <Button disabled variant="outline" className="w-full opacity-50">
                  {isCurrent ? "Votre plan" : "Plan par défaut"}
                </Button>
              ) : isCurrent ? (
                <Button disabled variant="outline" className="w-full opacity-60">Plan actuel</Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => payStripe(p.tier)}
                    disabled={loading !== null}
                    className="w-full"
                    variant={p.tier === "PRO" ? "default" : "secondary"}
                  >
                    <CreditCard className="h-4 w-4" />
                    {loading === `stripe-${p.tier}` ? "Redirection…" : "Payer par carte"}
                  </Button>
                  <Link href={`/access/crypto?plan=${p.tier}`} className="block">
                    <Button variant="outline" className="w-full" disabled={loading !== null}>
                      <Bitcoin className="h-4 w-4" /> Payer en Litecoin
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-zinc-600">
        Paiement en Litecoin : après vérification, vous recevez une clé <span className="font-mono">{"{PLAN}"}-XXXXX-…</span> à saisir dans{" "}
        <Link href="/access/activate" className="text-brand-400 hover:text-brand-300">l&apos;espace activation</Link>.
      </p>

      {/* Gestion de l'abonnement Stripe */}
      {info.subscription && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Gérer mon abonnement (carte)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Factures, moyen de paiement, résiliation — via le portail sécurisé Stripe
                {info.subscription.currentPeriodEnd &&
                  ` · Renouvellement le ${new Date(info.subscription.currentPeriodEnd).toLocaleDateString("fr-FR")}`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openPortal} disabled={loading !== null}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              {loading === "portal" ? "Ouverture…" : "Portail de facturation"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
