"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Gem, KeyRound, ScrollText, AlertTriangle, Loader2 } from "lucide-react";

type Plan = "STARTER" | "PRO" | "BUSINESS";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: Plan;
  accessStatus: string;
  createdAt: string;
  accessSubscription: { status: string; currentPeriodEnd: string | null } | null;
  _count: { activationKeys: number };
}

interface LogRow {
  id: string;
  action: string;
  success: boolean;
  ipAddress: string | null;
  createdAt: string;
  key: { key: string; plan: Plan } | null;
}

function PlanBadge({ plan }: { plan: Plan }) {
  if (plan === "BUSINESS") return <Badge variant="warning">Business</Badge>;
  if (plan === "PRO") return <Badge variant="info">Pro</Badge>;
  return <Badge>Starter</Badge>;
}

const ACTION_LABEL: Record<string, string> = {
  KEY_GENERATED: "Clé générée",
  KEY_REDEEMED: "Clé validée",
  KEY_SUSPENDED: "Clé suspendue",
  KEY_REACTIVATED: "Clé réactivée",
  KEY_EXPIRED: "Clé expirée",
  KEY_INVALID_ATTEMPT: "Tentative invalide",
};

export default function AdminSubscriptionsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [byPlan, setByPlan] = useState<Record<string, number>>({ STARTER: 0, PRO: 0, BUSINESS: 0 });
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const loadUsers = (all: boolean) => {
    apiFetch(`/api/admin/subscriptions${all ? "?all=1" : ""}`)
      .then((r) => {
        if (r.status === 403) throw new Error("Accès refusé");
        if (!r.ok) throw new Error("Erreur de chargement");
        return r.json();
      })
      .then((d) => {
        setUsers(d.users || []);
        if (d.byPlan) setByPlan(d.byPlan);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers(false);
    apiFetch("/api/admin/activation-logs")
      .then((r) => (r.ok ? r.json() : { logs: [] }))
      .then((d) => setLogs(d.logs || []))
      .catch(() => {});
  }, []);

  const changePlan = async (userId: string, plan: Plan) => {
    setBusy(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Échec");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan } : u)));
    } catch {
      alert("Erreur réseau");
    } finally {
      setBusy(null);
    }
  };

  const toggleAll = () => {
    const next = !showAll;
    setShowAll(next);
    setLoading(true);
    loadUsers(next);
  };

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
        <p className="font-medium text-red-400">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-brand-400 hover:text-brand-300">
          Réessayer
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Gem className="h-6 w-6 text-brand-400" /> Abonnements
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Utilisateurs activés, gestion des plans et journal d&apos;activation.</p>
        </div>
        <Link href="/admin/activation-keys">
          <Button variant="outline" size="sm"><KeyRound className="h-4 w-4" /> Clés</Button>
        </Link>
      </div>

      {/* Stats par plan */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs text-zinc-500">Starter</p>
          <p className="mt-1 text-2xl font-bold text-white">{byPlan.STARTER ?? 0}</p>
        </Card>
        <Card className="p-4 border-brand-500/15">
          <p className="text-xs text-zinc-500">Pro</p>
          <p className="mt-1 text-2xl font-bold text-brand-400">{byPlan.PRO ?? 0}</p>
        </Card>
        <Card className="p-4 border-amber-500/15">
          <p className="text-xs text-zinc-500">Business</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{byPlan.BUSINESS ?? 0}</p>
        </Card>
      </div>

      {/* Utilisateurs */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-zinc-400" /> Utilisateurs {showAll ? "" : "payants"} ({users.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={toggleAll}>{showAll ? "Payants seulement" : "Voir tous"}</Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium sm:px-6">Utilisateur</th>
                <th className="px-4 py-3 font-medium sm:px-6">Plan</th>
                <th className="hidden px-6 py-3 font-medium sm:table-cell">Clés</th>
                <th className="hidden px-6 py-3 font-medium sm:table-cell">Inscrit</th>
                <th className="px-4 py-3 font-medium sm:px-6">Changer le plan</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isAdmin = u.role === "ADMIN" || u.role === "ADMIN_OWNER";
                return (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-4 sm:px-6">
                      <p className="text-zinc-300">{u.name || "—"}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <PlanBadge plan={u.plan} />
                      {isAdmin && <span className="mt-1 block text-[10px] text-zinc-600">admin</span>}
                    </td>
                    <td className="hidden px-6 py-4 text-zinc-500 sm:table-cell">{u._count.activationKeys}</td>
                    <td className="hidden px-6 py-4 text-zinc-500 sm:table-cell">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-4 sm:px-6">
                      <select
                        value={u.plan}
                        disabled={busy === u.id}
                        onChange={(e) => changePlan(u.id, e.target.value as Plan)}
                        className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs text-white disabled:opacity-50"
                      >
                        <option value="STARTER">Starter</option>
                        <option value="PRO">Pro</option>
                        <option value="BUSINESS">Business</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Aucun utilisateur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Journal d'activation */}
      <Card className="overflow-hidden p-0">
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-4 w-4 text-zinc-400" /> Journal d&apos;activation</CardTitle>
        </div>
        <div className="mt-3 divide-y divide-white/[0.04]">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-300">{ACTION_LABEL[l.action] || l.action}</span>
                  {!l.success && <Badge variant="error">Échec</Badge>}
                  {l.key && <PlanBadge plan={l.key.plan} />}
                </div>
                {l.key && <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-600">{l.key.key}</p>}
              </div>
              <span className="flex-shrink-0 text-[11px] text-zinc-600">{new Date(l.createdAt).toLocaleString("fr-FR")}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="px-6 py-8 text-center text-zinc-500">Aucune activité</p>}
        </div>
      </Card>
    </div>
  );
}
