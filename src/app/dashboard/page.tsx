"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, CreditCard, CheckCircle, Wallet, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  availableBalance: number;
  pendingBalance: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalPayments: number;
  successRate: number;
  weeklyData: { name: string; revenue: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  if (!stats) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-sm text-zinc-400">Vue d&apos;ensemble de votre activité</p>
      </div>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-brand-600/20 bg-gradient-to-br from-brand-600/5 to-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-600/10 p-2.5">
              <Wallet className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Solde disponible</p>
              <p className="text-2xl font-bold text-white">{fmt(stats.availableBalance)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-600/10 p-2.5">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">En attente</p>
              <p className="text-2xl font-bold text-white">{fmt(stats.pendingBalance)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aujourd'hui" value={fmt(stats.todayRevenue)} icon={DollarSign} />
        <StatCard title="Cette semaine" value={fmt(stats.weekRevenue)} icon={TrendingUp} />
        <StatCard title="Ce mois" value={fmt(stats.monthRevenue)} icon={CreditCard} />
        <StatCard title="Taux de succès" value={`${stats.successRate}%`} icon={CheckCircle} changeType="positive" />
      </div>

      {/* Chart */}
      <Card>
        <CardTitle className="mb-6">Revenus de la semaine</CardTitle>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.weeklyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => `${v / 100}€`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
                labelStyle={{ color: "#a1a1aa" }}
                formatter={(value: number) => [fmt(value), "Revenus"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#DC2626" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
