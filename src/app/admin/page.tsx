"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, Banknote, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  totalPayouts: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  wallet: { availableBalance: number } | null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users || []));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Administration</h1>
          <p className="text-sm text-zinc-400">Vue d&apos;ensemble de la plateforme</p>
        </div>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Utilisateurs" value={String(stats.totalUsers)} icon={Users} />
            <StatCard title="Transactions" value={String(stats.totalTransactions)} icon={CreditCard} />
            <StatCard title="Volume total" value={fmt(stats.totalVolume)} icon={TrendingUp} />
            <StatCard title="Retraits" value={String(stats.totalPayouts)} icon={Banknote} />
          </div>
        )}

        <Card className="overflow-hidden p-0">
          <div className="px-6 pt-6">
            <CardTitle>Utilisateurs</CardTitle>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="px-6 py-3 font-medium">Nom</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Solde</th>
                  <th className="px-6 py-3 font-medium">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                    <td className="px-6 py-4 text-zinc-300">{u.email}</td>
                    <td className="px-6 py-4 text-zinc-300">{u.wallet ? fmt(u.wallet.availableBalance) : "—"}</td>
                    <td className="px-6 py-4 text-zinc-400">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
