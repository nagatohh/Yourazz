"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  CreditCard,
  Banknote,
  TrendingUp,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  totalPayouts: number;
  pendingPayouts: number;
  failedTransactions: number;
  todayVolume: number;
  weekVolume: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  status: string;
  createdAt: string;
  wallet: { availableBalance: number; pendingBalance: number } | null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(attempt = 0) {
      try {
        const [statsRes, usersRes] = await Promise.all([
          apiFetch("/api/admin/stats"),
          apiFetch("/api/admin/users"),
        ]);

        if (cancelled) return;

        // Retry on 500 (cold start / DB timeout)
        if ((statsRes.status >= 500 || usersRes.status >= 500) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500));
          return load(attempt + 1);
        }

        if (statsRes.status === 403 || usersRes.status === 403) {
          setError("Acces refuse — vous n'avez pas les droits administrateur");
          setLoading(false);
          return;
        }

        if (!statsRes.ok || !usersRes.ok) {
          const errBody = await (statsRes.ok ? usersRes : statsRes).json().catch(() => null);
          setError(errBody?.error || `Erreur ${statsRes.status || usersRes.status}`);
          setLoading(false);
          return;
        }

        const [s, u] = await Promise.all([statsRes.json(), usersRes.json()]);
        if (cancelled) return;

        setStats(s);
        setUsers(u.users || []);
      } catch (e: any) {
        if (cancelled) return;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500));
          return load(attempt + 1);
        }
        setError("Erreur reseau — verifiez votre connexion");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );

  if (error)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-red-400 font-medium text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-brand-400 hover:text-brand-300"
        >
          Reessayer
        </button>
      </div>
    );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Administration
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Vue d&apos;ensemble de la plateforme Yourazz
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-400">Systeme operationnel</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard title="Utilisateurs" value={String(stats.totalUsers)} icon={Users} />
          <StatCard title="Transactions" value={String(stats.totalTransactions)} icon={CreditCard} />
          <StatCard title="Volume total" value={fmt(stats.totalVolume)} icon={TrendingUp} />
          <StatCard title="Retraits" value={String(stats.totalPayouts)} icon={Banknote} />
        </div>
      )}

      {/* Secondary stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-zinc-500">Volume aujourd&apos;hui</p>
            <p className="text-lg font-bold text-white mt-1">{fmt(stats.todayVolume)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-zinc-500">Volume semaine</p>
            <p className="text-lg font-bold text-white mt-1">{fmt(stats.weekVolume)}</p>
          </Card>
          <Card className="p-4 border-amber-500/10">
            <p className="text-xs text-zinc-500">Payouts en attente</p>
            <p className="text-lg font-bold text-amber-400 mt-1">{stats.pendingPayouts}</p>
          </Card>
          <Card className="p-4 border-red-500/10">
            <p className="text-xs text-zinc-500">Tx echouees</p>
            <p className="text-lg font-bold text-red-400 mt-1">{stats.failedTransactions}</p>
          </Card>
        </div>
      )}

      {/* Users table */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
          <CardTitle className="text-base">Utilisateurs ({users.length})</CardTitle>
          <Link href="/admin/invitations">
            <Button variant="outline" size="sm">
              Invitations
            </Button>
          </Link>
        </div>

        {/* Mobile list */}
        <div className="divide-y divide-white/[0.04] sm:hidden">
          {users.map((u) => (
            <div key={u.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/20">
                    <span className="text-[10px] font-bold text-brand-400">
                      {(u.name || u.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {u.name || "Sans nom"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    u.role === "ADMIN_OWNER" || u.role === "ADMIN" ? "info" : "default"
                  }
                >
                  {u.role}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2 ml-11">
                {u.wallet && (
                  <span className="text-xs text-zinc-400">
                    {fmt(u.wallet.availableBalance)}
                  </span>
                )}
                {u.emailVerified ? (
                  <Badge variant="success">Verifie</Badge>
                ) : (
                  <Badge variant="warning">Non verifie</Badge>
                )}
                {u.status === "SUSPENDED" && <Badge variant="error">Suspendu</Badge>}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                <th className="px-6 py-3.5 font-medium">Utilisateur</th>
                <th className="px-6 py-3.5 font-medium">Role</th>
                <th className="px-6 py-3.5 font-medium">Statut</th>
                <th className="px-6 py-3.5 font-medium">Solde</th>
                <th className="px-6 py-3.5 font-medium">En attente</th>
                <th className="px-6 py-3.5 font-medium">Inscrit</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/20">
                        <span className="text-[10px] font-bold text-brand-400">
                          {(u.name || u.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.name || "—"}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        u.role === "ADMIN_OWNER" || u.role === "ADMIN"
                          ? "info"
                          : "default"
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {u.emailVerified ? (
                        <Badge variant="success">Verifie</Badge>
                      ) : (
                        <Badge variant="warning">Non verifie</Badge>
                      )}
                      {u.status === "SUSPENDED" && (
                        <Badge variant="error">Suspendu</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {u.wallet ? fmt(u.wallet.availableBalance) : "—"}
                  </td>
                  <td className="px-6 py-4 text-amber-400">
                    {u.wallet && u.wallet.pendingBalance > 0
                      ? fmt(u.wallet.pendingBalance)
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
