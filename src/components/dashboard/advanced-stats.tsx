"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { hasFeature } from "@/lib/services/permissions";
import { Card, CardTitle } from "@/components/ui/card";
import { PremiumGate, PlanBadge } from "@/components/dashboard/premium-gate";
import { BarChart3 } from "lucide-react";

type Plan = "STARTER" | "PRO" | "BUSINESS";

interface AdvData {
  totals: { revenue: number; net: number; count: number; avgBasket: number; successRate: number };
  byMethod: { method: string; amount: number; count: number }[];
  byDay: { name: string; revenue: number }[];
  topPayers: { email: string | null; amount: number; count: number }[];
}

const METHOD_LABEL: Record<string, string> = {
  CARD: "Carte",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  OPEN_BANKING: "Virement",
  BANK_TRANSFER: "Virement",
  SEPA: "SEPA",
  PAYPAL: "PayPal",
  REVOLUT_PAY: "Revolut",
};

// Aperçu flouté présenté aux comptes non-Business (données fictives).
const PREVIEW: AdvData = {
  totals: { revenue: 1284000, net: 1264740, count: 312, avgBasket: 4115, successRate: 97 },
  byMethod: [
    { method: "CARD", amount: 820000, count: 198 },
    { method: "APPLE_PAY", amount: 310000, count: 78 },
    { method: "GOOGLE_PAY", amount: 154000, count: 36 },
  ],
  byDay: [],
  topPayers: [
    { email: "client.fidele@email.com", amount: 96000, count: 8 },
    { email: "boutique.pro@email.com", amount: 72000, count: 5 },
    { email: "marie.l@email.com", amount: 48000, count: 4 },
  ],
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n / 100);

export function AdvancedStats() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState<AdvData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setPlan(d.user.plan as Plan);
          setIsAdmin(d.user.role === "ADMIN" || d.user.role === "ADMIN_OWNER");
        }
      })
      .finally(() => setLoaded(true))
      .catch(() => setLoaded(true));
  }, []);

  const unlocked = plan ? hasFeature(plan, "advancedStats", { isAdmin }) : false;

  useEffect(() => {
    if (unlocked && !data) {
      apiFetch("/api/analytics/advanced")
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setData(d);
        })
        .catch(() => {});
    }
  }, [unlocked, data]);

  if (!loaded) return null;

  const view = unlocked ? data : PREVIEW;

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BarChart3 className="h-4 w-4 text-brand-400" /> Statistiques avancées
          {!unlocked && <PlanBadge tier="BUSINESS" />}
        </CardTitle>
        <span className="text-xs text-zinc-600">30 derniers jours</span>
      </div>

      <PremiumGate unlocked={unlocked} requiredPlan="BUSINESS" featureLabel="Statistiques avancées">
        {!view ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Totaux */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Revenu net (30j)", value: fmt(view.totals.net) },
                { label: "Paiements", value: String(view.totals.count) },
                { label: "Panier moyen", value: fmt(view.totals.avgBasket) },
                { label: "Taux de succès", value: `${view.totals.successRate}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[11px] text-zinc-500">{s.label}</p>
                  <p className="mt-1 text-lg font-bold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Répartition par méthode */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Par méthode</p>
                <div className="space-y-2.5">
                  {view.byMethod.length === 0 && <p className="text-xs text-zinc-600">Aucune donnée</p>}
                  {view.byMethod.map((m) => {
                    const max = view.byMethod[0]?.amount || 1;
                    return (
                      <div key={m.method}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-zinc-300">{METHOD_LABEL[m.method] ?? m.method}</span>
                          <span className="text-zinc-500">{fmt(m.amount)} · {m.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="h-full rounded-full gradient-brand" style={{ width: `${Math.round((m.amount / max) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meilleurs clients */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Meilleurs clients</p>
                <div className="space-y-2">
                  {view.topPayers.length === 0 && <p className="text-xs text-zinc-600">Aucune donnée</p>}
                  {view.topPayers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 border-b border-white/[0.04] py-1.5 last:border-0">
                      <span className="truncate text-xs text-zinc-300">{p.email ?? "Anonyme"}</span>
                      <span className="flex-shrink-0 text-xs font-semibold text-white">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </PremiumGate>
    </Card>
  );
}
