"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Gem, AlertTriangle } from "lucide-react";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  plan: string;
  role: string;
  status: string;
  monthlyVolume?: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bumping, setBumping] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const bump = async (userId: string, plan: "PRO" | "BUSINESS") => {
    setBumping(userId);
    setMessage("");
    try {
      const res = await apiFetch("/api/admin/bump-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Erreur"); return; }
      setMessage(`${data.user} : ${data.from} → ${data.to}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan } : u));
    } catch {
      setMessage("Erreur réseau");
    } finally {
      setBumping(null);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Users className="h-6 w-6 text-brand-400" /> Gestion des utilisateurs
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Voir et modifier les plans des utilisateurs</p>
      </div>

      {message && (
        <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 px-4 py-2.5">
          <p className="text-sm text-brand-300">{message}</p>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="px-6 pt-6 pb-3">
          <CardTitle className="text-base">Utilisateurs ({users.length})</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                <th className="px-6 py-3 font-medium">Utilisateur</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Rôle</th>
                <th className="px-6 py-3 font-medium">Inscrit</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{u.name || u.username || "—"}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.plan === "BUSINESS" ? "warning" : u.plan === "PRO" ? "info" : "default"}>
                      {u.plan}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.role.includes("ADMIN") ? "info" : "default"}>{u.role}</Badge>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      {u.plan !== "PRO" && (
                        <Button size="sm" variant="outline" disabled={bumping === u.id} onClick={() => bump(u.id, "PRO")}>
                          <Gem className="h-3 w-3 text-brand-400" /> Pro
                        </Button>
                      )}
                      {u.plan !== "BUSINESS" && (
                        <Button size="sm" variant="outline" disabled={bumping === u.id} onClick={() => bump(u.id, "BUSINESS")}>
                          <Gem className="h-3 w-3 text-amber-400" /> Business
                        </Button>
                      )}
                      {u.plan !== "STARTER" && (
                        <Button size="sm" variant="ghost" disabled className="text-zinc-600 text-[10px]">
                          {u.plan}
                        </Button>
                      )}
                    </div>
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
