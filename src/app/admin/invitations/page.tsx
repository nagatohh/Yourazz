"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Mail } from "lucide-react";

interface InvitationRow { id: string; email: string; role: string; expiresAt: string; usedAt: string | null; createdAt: string; inviter: { name: string; email: string } | null; }

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"USER" | "ADMIN">("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/admin/invitations").then((r) => r.json()).then((d) => setInvitations(d.invitations || []));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail("");
      fetch("/api/admin/invitations").then((r) => r.json()).then((d) => setInvitations(d.invitations || []));
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
    setInvitations(invitations.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Invitations</h1>
        <p className="text-sm text-zinc-500 mt-1">Gérer les invitations et autoriser de nouveaux utilisateurs</p>
      </div>

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
          <Button type="submit" disabled={loading}>
            <Plus className="h-4 w-4" /> {loading ? "Envoi..." : "Inviter"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}
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
                      <button onClick={() => handleDelete(inv.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
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
    </div>
  );
}
