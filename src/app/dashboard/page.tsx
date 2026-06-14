"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  LinkIcon,
  ArrowRight,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import RevenueChart from "@/components/dashboard/revenue-chart";
import MethodBreakdown from "@/components/dashboard/method-breakdown";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { AdvancedStats } from "@/components/dashboard/advanced-stats";

interface Stats {
  availableBalance: number;
  pendingBalance: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalWithdrawn: number;
  totalPayments: number;
  successRate: number;
  weekTrend: number | null;
  monthTrend: number | null;
  avgPayment: number;
  methodBreakdown: { method: string; count: number; amount: number }[];
  weeklyData: { name: string; revenue: number }[];
  monthlyData: { name: string; revenue: number }[];
  recentTransactions: {
    id: string;
    type: string;
    status: string;
    amount: number;
    payerName: string | null;
    payerEmail: string | null;
    createdAt: string;
  }[];
}

interface WalletStatus {
  stripeConnected: boolean;
  payoutsEnabled: boolean;
}

const EMPTY_STATS: Stats = {
  availableBalance: 0,
  pendingBalance: 0,
  todayRevenue: 0,
  weekRevenue: 0,
  monthRevenue: 0,
  totalWithdrawn: 0,
  totalPayments: 0,
  successRate: 0,
  weekTrend: null,
  monthTrend: null,
  avgPayment: 0,
  methodBreakdown: [],
  weeklyData: [],
  monthlyData: [],
  recentTransactions: [],
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-6 lg:col-span-2">
          <Skeleton className="mb-6 h-5 w-24" />
          <Skeleton className="h-48 w-full sm:h-64" />
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [wallet, setWallet] = useState<WalletStatus | null>(null);
  const [chartTab, setChartTab] = useState<"week" | "month">("week");

  useEffect(() => {
    apiFetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.error ? EMPTY_STATS : d))
      .catch(() => setStats(EMPTY_STATS));

    apiFetch("/api/wallet?light=1")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setWallet({ stripeConnected: !!d.stripeConnected, payoutsEnabled: !!d.payoutsEnabled });
      })
      .catch(() => {});
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  if (!stats) return <DashboardSkeleton />;

  const chartData = chartTab === "week" ? stats.weeklyData : stats.monthlyData;

  const trendLabel = (t: number | null, period: string) =>
    t === null ? undefined : `${t >= 0 ? "+" : ""}${t}% vs ${period}`;
  const trendType = (t: number | null): "positive" | "negative" | "neutral" =>
    t === null || t === 0 ? "neutral" : t > 0 ? "positive" : "negative";

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Vue d&apos;ensemble de votre activité
          </p>
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/payment-link">
            <Button variant="outline" size="sm">
              <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
              Lien de paiement
            </Button>
          </Link>
          <Link href="/dashboard/payouts">
            <Button size="sm">
              <Banknote className="mr-1.5 h-3.5 w-3.5" />
              Retirer
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding nouveaux utilisateurs — disparaît une fois complété */}
      <OnboardingChecklist />

      {/* État du compte de paiement */}
      {wallet && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
              wallet.stripeConnected
                ? "border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-400"
                : "border-amber-500/15 bg-amber-500/[0.05] text-amber-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${wallet.stripeConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
            {wallet.stripeConnected ? "Paiements actifs" : "Paiements en cours d'activation"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-zinc-400">
            <ShieldCheck className="h-3 w-3 text-brand-400" />
            Chargeback Defender actif
          </span>
        </div>
      )}

      {/* Cartes de solde */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className="border-brand-500/10 bg-gradient-to-br from-brand-500/[0.05] to-transparent p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-xl bg-brand-500/10 p-2.5 sm:p-3 flex-shrink-0">
                <Wallet className="h-5 w-5 text-brand-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-zinc-500">Solde disponible</p>
                <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {fmt(stats.availableBalance)}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/payouts"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-400 hover:text-brand-300 hover:bg-white/[0.04] transition-colors"
              aria-label="Retirer mon solde"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-xl bg-amber-500/10 p-2.5 sm:p-3 flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-zinc-500">En attente</p>
                <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {fmt(stats.pendingBalance)}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Clearing
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Grille de stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title="Aujourd'hui" value={fmt(stats.todayRevenue)} icon={DollarSign} />
        <StatCard
          title="Cette semaine"
          value={fmt(stats.weekRevenue)}
          icon={TrendingUp}
          change={trendLabel(stats.weekTrend, "sem. préc.")}
          changeType={trendType(stats.weekTrend)}
        />
        <StatCard
          title="Ce mois"
          value={fmt(stats.monthRevenue)}
          icon={CreditCard}
          change={trendLabel(stats.monthTrend, "mois préc.")}
          changeType={trendType(stats.monthTrend)}
        />
        <StatCard
          title="Taux de succès"
          value={`${stats.successRate}%`}
          icon={CheckCircle}
          changeType="positive"
        />
      </div>

      {/* Graphique + transactions récentes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <CardTitle className="text-base sm:text-lg">Revenus</CardTitle>
            <div className="flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5">
              <button
                onClick={() => setChartTab("week")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  chartTab === "week"
                    ? "bg-brand-500/10 text-brand-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setChartTab("month")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  chartTab === "month"
                    ? "bg-brand-500/10 text-brand-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Mois
              </button>
            </div>
          </div>
          <RevenueChart data={chartData} />
        </Card>

        {/* Activité récente */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-base">Activité récente</CardTitle>
            <Link
              href="/dashboard/transactions"
              className="text-xs text-zinc-500 hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentTransactions.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Aucune transaction"
                description="Partagez votre lien de paiement pour recevoir votre premier paiement."
                action={
                  <Link href="/dashboard/payment-link">
                    <Button variant="outline" size="sm">
                      <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                      Voir mon lien
                    </Button>
                  </Link>
                }
              />
            ) : (
              stats.recentTransactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                        tx.type === "PAYIN"
                          ? "bg-emerald-500/10"
                          : "bg-orange-500/10"
                      }`}
                    >
                      {tx.type === "PAYIN" ? (
                        <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-orange-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {tx.payerName || tx.payerEmail || (tx.type === "PAYOUT" ? "Retrait" : "Paiement")}
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ${
                      tx.type === "PAYIN" ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {tx.type === "PAYIN" ? "+" : "-"}
                    {fmt(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Rangée de stats secondaires */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Total retiré</p>
              <p className="text-lg font-bold text-white mt-1">{fmt(stats.totalWithdrawn)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5">
              <Banknote className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Paiements reçus</p>
              <p className="text-lg font-bold text-white mt-1">{stats.totalPayments}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <CreditCard className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Panier moyen ce mois</p>
              <p className="text-lg font-bold text-white mt-1">{fmt(stats.avgPayment)}</p>
            </div>
            <div className="rounded-xl bg-brand-500/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-brand-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Répartition par méthode de paiement */}
      <Card className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg mb-4 sm:mb-6">
          Méthodes de paiement
        </CardTitle>
        <MethodBreakdown data={stats.methodBreakdown} />
      </Card>

      {/* Statistiques avancées — verrouillées hors Business */}
      <AdvancedStats />
    </div>
  );
}
