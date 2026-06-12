"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Gem, TrendingUp, ExternalLink, AlertCircle } from "lucide-react";

interface PlanInfo {
  plan: "STARTER" | "PRO" | "BUSINESS";
  isAdmin: boolean;
  monthlyUsed: number;
  monthlyCap: number | null;
  subscription: { status: string; currentPeriodEnd: string | null; canceledAt: string | null } | null;
  plans: { tier: string; name: string; price: number; monthlyCap: number | null }[];
}

const FEATURES: Record<string, string[]> = {
  STARTER: ["500 € d'encaissement / mois", "Lien de paiement personnalisable", "Retraits illimités", "Chargeback Defender inclus"],
  PRO: ["1 500 € d'encaissement / mois", "Tout le plan Starter", "Multi-devises (EUR, USD, GBP)", "Support prioritaire"],
  BUSINESS: ["Encaissement illimité", "Tout le plan Pro", "Statistiques avancées", "Accompagnement dédié"],
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

  const choosePlan = async (tier: string) => {
    setError("");
    setLoading(tier);
    try {
      const res = await apiFetch("/api/plans/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); return; }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      // Changement de price sur l'abonnement existant (proration immédiate)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Mon plan</h1>
        <p className="text-sm text-zinc-500 mt-1">Plafond d&apos;encaissement mensuel et abonnement</p>
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
                    ? `Plafond du plan ${info.plans.find((p) => p.tier === info.plan)?.name} : ${fmt(info.monthlyCap)}/mois`
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

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Grille des plans */}
      <div className="grid gap-4 lg:grid-cols-3">
        {info.plans.map((p) => {
          const isCurrent = p.tier === info.plan;
          const isUpgradable = p.tier !== "STARTER" && !isCurrent;
          return (
            <Card
              key={p.tier}
              className={`relative flex flex-col p-5 sm:p-6 ${
                p.tier === "PRO" ? "border-brand-500/25 bg-gradient-to-br from-brand-500/[0.05] to-transparent" : ""
              }`}
            >
              {p.tier === "PRO" && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full gradient-brand px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Populaire
                </span>
              )}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gem className={`h-4 w-4 ${p.tier === "STARTER" ? "text-zinc-400" : p.tier === "PRO" ? "text-brand-400" : "text-amber-400"}`} />
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                </div>
                {isCurrent && <Badge variant="success">Plan actuel</Badge>}
              </div>
              <p className="mb-1 text-3xl font-bold tracking-tight text-white">
                {p.price === 0 ? "Gratuit" : `${(p.price / 100).toFixed(2).replace(".", ",")} €`}
                {p.price > 0 && <span className="text-sm font-normal text-zinc-500"> /mois</span>}
              </p>
              <p className="mb-5 text-xs text-zinc-500">
                {p.monthlyCap ? `Jusqu'à ${fmt(p.monthlyCap)} encaissés par mois` : "Encaissement illimité"}
              </p>
              <ul className="mb-6 flex-1 space-y-2.5">
                {(FEATURES[p.tier] || []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-zinc-400">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              {isUpgradable ? (
                <Button
                  onClick={() => choosePlan(p.tier)}
                  disabled={loading !== null}
                  className="w-full"
                  variant={p.tier === "PRO" ? "default" : "outline"}
                >
                  {loading === p.tier ? "Redirection…" : info.plan === "BUSINESS" ? "Rétrograder" : "Choisir ce plan"}
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full opacity-50">
                  {isCurrent ? "Votre plan" : "Plan par défaut"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Gestion de l'abonnement */}
      {info.subscription && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Gérer mon abonnement</CardTitle>
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
