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
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RevenueChart from "@/components/dashboard/revenue-chart";

interface Stats {
  availableBalance: number;
  pendingBalance: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalWithdrawn: number;
  totalPayments: number;
  successRate: number;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartTab, setChartTab] = useState<"week" | "month">("week");

  useEffect(() => {
    apiFetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setStats({
            availableBalance: 0,
            pendingBalance: 0,
            todayRevenue: 0,
            weekRevenue: 0,
            monthRevenue: 0,
            totalWithdrawn: 0,
            totalPayments: 0,
            successRate: 0,
            weeklyData: [],
            monthlyData: [],
            recentTransactions: [],
          });
        } else {
          setStats(d);
        }
      })
      .catch(() =>
        setStats({
          availableBalance: 0,
          pendingBalance: 0,
          todayRevenue: 0,
          weekRevenue: 0,
          monthRevenue: 0,
          totalWithdrawn: 0,
          totalPayments: 0,
          successRate: 0,
          weeklyData: [],
          monthlyData: [],
          recentTransactions: [],
        })
      );
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  if (!stats)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );

  const chartData = chartTab === "week" ? stats.weeklyData : stats.monthlyData;

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

        {/* Quick actions */}
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

      {/* Balance cards */}
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
                En cours
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title="Aujourd'hui" value={fmt(stats.todayRevenue)} icon={DollarSign} />
        <StatCard title="Cette semaine" value={fmt(stats.weekRevenue)} icon={TrendingUp} />
        <StatCard title="Ce mois" value={fmt(stats.monthRevenue)} icon={CreditCard} />
        <StatCard
          title="Taux de succès"
          value={`${stats.successRate}%`}
          icon={CheckCircle}
          changeType="positive"
        />
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Chart - lazy loaded */}
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

        {/* Recent Activity */}
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
              <p className="text-sm text-zinc-500 text-center py-8">
                Aucune transaction
              </p>
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

      {/* Bottom stats row */}
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
              <p className="text-xs text-zinc-500">Volume ce mois</p>
              <p className="text-lg font-bold text-white mt-1">{fmt(stats.monthRevenue)}</p>
            </div>
            <div className="rounded-xl bg-purple-500/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
