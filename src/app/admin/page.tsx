"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, CreditCard, Banknote, TrendingUp, Plus, Trash2, Mail } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface AdminStats { totalUsers: number; totalTransactions: number; totalVolume: number; totalPayouts: number; }
interface UserRow { id: string; name: string; email: string; role: string; emailVerified: boolean; createdAt: string; wallet: { availableBalance: number } | null; }
interface InvitationRow { id: string; email: string; role: string; expiresAt: string; usedAt: string | null; createdAt: string; inviter: { name: string; email: string } | null; }

type Tab = "overview" | "invitations" | "payments";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"USER" | "ADMIN">("USER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users || []));
    fetch("/api/admin/invitations").then((r) => r.json()).then((d) => setInvitations(d.invitations || []));
    fetch("/api/admin/transactions").then((r) => r.json()).then((d) => setTransactions(d.transactions || []));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(""); setInviteSuccess(""); setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error); return; }
      setInviteSuccess(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail("");
      fetch("/api/admin/invitations").then((r) => r.json()).then((d) => setInvitations(d.invitations || []));
    } catch { setInviteError("Erreur réseau"); } finally { setInviteLoading(false); }
  };

  const handleDeleteInvite = async (id: string) => {
    await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
    setInvitations(invitations.filter((i) => i.id !== id));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "invitations", label: "Invitations" },
    { id: "payments", label: "Paiements" },
  ];

  return (
    <div className="min-h-screen bg-[#06060a] p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administration</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestion de la plateforme Yourazz</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-brand-500/10 text-brand-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <>
            {stats && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Utilisateurs" value={String(stats.totalUsers)} icon={Users} />
                <StatCard title="Transactions" value={String(stats.totalTransactions)} icon={CreditCard} />
                <StatCard title="Volume total" value={fmt(stats.totalVolume)} icon={TrendingUp} />
                <StatCard title="Retraits" value={String(stats.totalPayouts)} icon={Banknote} />
              </div>
            )}
            <Card className="overflow-hidden p-0">
              <div className="px-6 pt-6"><CardTitle>Utilisateurs</CardTitle></div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                      <th className="px-6 py-3 font-medium">Nom</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Rôle</th>
                      <th className="px-6 py-3 font-medium">Vérifié</th>
                      <th className="px-6 py-3 font-medium">Solde</th>
                      <th className="px-6 py-3 font-medium">Inscrit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-medium text-white">{u.name || "—"}</td>
                        <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                        <td className="px-6 py-4"><Badge variant={u.role === "ADMIN_OWNER" || u.role === "ADMIN" ? "info" : "default"}>{u.role}</Badge></td>
                        <td className="px-6 py-4">{u.emailVerified ? <Badge variant="success">Oui</Badge> : <Badge variant="warning">Non</Badge>}</td>
                        <td className="px-6 py-4 text-zinc-300">{u.wallet ? fmt(u.wallet.availableBalance) : "—"}</td>
                        <td className="px-6 py-4 text-zinc-500">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Invitations Tab */}
        {tab === "invitations" && (
          <>
            <Card className="p-6">
              <CardTitle className="mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-brand-400" /> Inviter un utilisateur</CardTitle>
              <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Input id="invite-email" label="Email" type="email" placeholder="utilisateur@exemple.fr" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Rôle</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white">
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={inviteLoading}>
                  <Plus className="h-4 w-4" /> {inviteLoading ? "Envoi..." : "Inviter"}
                </Button>
              </form>
              {inviteError && <p className="mt-3 text-sm text-red-400">{inviteError}</p>}
              {inviteSuccess && <p className="mt-3 text-sm text-emerald-400">{inviteSuccess}</p>}
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="px-6 pt-6"><CardTitle>Invitations envoyées</CardTitle></div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Rôle</th>
                      <th className="px-6 py-3 font-medium">Statut</th>
                      <th className="px-6 py-3 font-medium">Expire</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-6 py-4 text-zinc-300">{inv.email}</td>
                        <td className="px-6 py-4"><Badge>{inv.role}</Badge></td>
                        <td className="px-6 py-4">
                          {inv.usedAt ? <Badge variant="success">Utilisée</Badge> :
                           new Date(inv.expiresAt) < new Date() ? <Badge variant="error">Expirée</Badge> :
                           <Badge variant="warning">En attente</Badge>}
                        </td>
                        <td className="px-6 py-4 text-zinc-500">{new Date(inv.expiresAt).toLocaleDateString("fr-FR")}</td>
                        <td className="px-6 py-4">
                          {!inv.usedAt && (
                            <button onClick={() => handleDeleteInvite(inv.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invitations.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Aucune invitation</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Payments Tab */}
        {tab === "payments" && (
          <Card className="overflow-hidden p-0">
            <div className="px-6 pt-6"><CardTitle>Tous les paiements</CardTitle></div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Montant</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Reçu</th>
                    <th className="px-6 py-3 font-medium">Provider ID</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-zinc-400">{new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-6 py-4 text-zinc-300">{tx.payerEmail || tx.user?.email || "—"}</td>
                      <td className="px-6 py-4 font-medium text-white">{fmt(tx.amount)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={tx.status === "SUCCEEDED" ? "success" : tx.status === "PENDING" ? "warning" : tx.status === "FAILED" ? "error" : "default"}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">{tx.receiptSent ? <Badge variant="success">Envoyé</Badge> : <span className="text-zinc-600">—</span>}</td>
                      <td className="px-6 py-4 text-zinc-600 text-xs font-mono">{tx.providerTransactionId?.slice(0, 20) || "—"}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Aucun paiement</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
