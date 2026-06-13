"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Plus, Copy, Check, Ban, RotateCcw, Bitcoin, AlertTriangle, Loader2 } from "lucide-react";

interface KeyRow {
  id: string;
  key: string;
  status: "ACTIVE" | "USED" | "REVOKED";
  note: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  cryptoPaymentId: string | null;
  user: { id: string; email: string; name: string | null } | null;
}

function KeyStatus({ status }: { status: KeyRow["status"] }) {
  if (status === "USED") return <Badge variant="info">Utilisée</Badge>;
  if (status === "REVOKED") return <Badge variant="error">Révoquée</Badge>;
  return <Badge variant="success">Active</Badge>;
}

export default function AdminActivationKeysPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    apiFetch("/api/admin/activation-keys")
      .then((r) => {
        if (r.status === 403) throw new Error("Accès refusé");
        if (!r.ok) throw new Error("Erreur de chargement");
        return r.json();
      })
      .then((d) => setKeys(d.keys || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setJustCreated(null);
    setGenerating(true);
    try {
      const payload: Record<string, unknown> = {};
      if (email.trim()) payload.email = email.trim();
      if (expiresInDays.trim()) payload.expiresInDays = Number(expiresInDays);
      if (note.trim()) payload.note = note.trim();

      const res = await fetch("/api/admin/activation-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Échec de la génération");
        return;
      }
      setJustCreated(data.key.key);
      setEmail("");
      setExpiresInDays("");
      setNote("");
      load();
    } catch {
      setFormError("Erreur réseau");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      /* clipboard indisponible */
    }
  };

  const updateKey = async (id: string, action: "revoke" | "reactivate") => {
    if (action === "revoke" && !confirm("Révoquer cette clé ? Elle ne pourra plus être utilisée.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/activation-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Échec de l'opération");
        return;
      }
      load();
    } catch {
      alert("Erreur réseau");
    } finally {
      setBusy(null);
    }
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
            <KeyRound className="h-6 w-6 text-brand-400" /> Clés d&apos;activation
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Générez, consultez, révoquez ou réactivez les clés d&apos;accès.
          </p>
        </div>
        <Link href="/admin/crypto-payments">
          <Button variant="outline" size="sm">
            <Bitcoin className="h-4 w-4" /> Paiements
          </Button>
        </Link>
      </div>

      {/* Génération */}
      <Card className="p-4 sm:p-6">
        <CardTitle className="mb-4 flex items-center gap-2 text-base">
          <Plus className="h-5 w-5 text-brand-400" /> Générer une clé
        </CardTitle>
        <form onSubmit={generate} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-[220px]">
            <Input
              id="key-email"
              label="Email du compte (recommandé)"
              type="email"
              placeholder="utilisateur@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="sm:w-40">
            <Input
              id="key-expiry"
              label="Expire (jours)"
              type="number"
              min={1}
              max={365}
              placeholder="illimité"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
          </div>
          <div className="min-w-0 flex-1 sm:min-w-[160px]">
            <Input
              id="key-note"
              label="Note (optionnel)"
              placeholder="ex : remboursement"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={generating} className="w-full sm:w-auto">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {generating ? "Génération…" : "Générer"}
          </Button>
        </form>
        {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
        <p className="mt-3 text-xs text-zinc-500">
          Sans email, la clé est générique et se liera au premier compte qui l&apos;utilisera.
        </p>

        {justCreated && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-xs text-emerald-300">Clé générée — copiez-la et transmettez-la à l&apos;utilisateur :</p>
            <div className="mt-2 flex items-stretch gap-2">
              <code className="flex-1 break-all rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-emerald-300">
                {justCreated}
              </code>
              <button
                onClick={() => copy("new", justCreated)}
                className="flex flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                aria-label="Copier"
              >
                {copiedId === "new" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Liste */}
      <Card className="overflow-hidden p-0">
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="text-base">Clés ({keys.length})</CardTitle>
        </div>

        {/* Mobile */}
        <div className="mt-3 divide-y divide-white/[0.04] sm:hidden">
          {keys.map((k) => (
            <div key={k.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <code className="min-w-0 truncate font-mono text-xs text-zinc-300">{k.key}</code>
                <KeyStatus status={k.status} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">{k.user?.email || "Générique"}</p>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => copy(k.id, k.key)} className="p-1.5 text-zinc-500 hover:text-white" aria-label="Copier">
                  {copiedId === k.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                {k.status === "ACTIVE" && (
                  <button onClick={() => updateKey(k.id, "revoke")} disabled={busy === k.id} className="p-1.5 text-zinc-500 hover:text-red-400" aria-label="Révoquer">
                    <Ban className="h-4 w-4" />
                  </button>
                )}
                {k.status === "REVOKED" && (
                  <button onClick={() => updateKey(k.id, "reactivate")} disabled={busy === k.id} className="p-1.5 text-zinc-500 hover:text-emerald-400" aria-label="Réactiver">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {keys.length === 0 && <p className="px-4 py-8 text-center text-zinc-500">Aucune clé</p>}
        </div>

        {/* Desktop */}
        <div className="mt-4 hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                <th className="px-6 py-3 font-medium">Clé</th>
                <th className="px-6 py-3 font-medium">Compte lié</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium">Expire</th>
                <th className="px-6 py-3 font-medium">Créée</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-zinc-300">{k.key}</code>
                      <button onClick={() => copy(k.id, k.key)} className="text-zinc-600 hover:text-white" aria-label="Copier">
                        {copiedId === k.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {k.cryptoPaymentId && <span className="mt-0.5 block text-[11px] text-zinc-600">Paiement crypto</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-zinc-400">{k.user?.email || <span className="text-zinc-600">Générique</span>}</span>
                  </td>
                  <td className="px-6 py-4"><KeyStatus status={k.status} /></td>
                  <td className="px-6 py-4 text-zinc-500">
                    {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{new Date(k.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    {k.status === "ACTIVE" && (
                      <button onClick={() => updateKey(k.id, "revoke")} disabled={busy === k.id} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400">
                        <Ban className="h-3.5 w-3.5" /> Révoquer
                      </button>
                    )}
                    {k.status === "REVOKED" && (
                      <button onClick={() => updateKey(k.id, "reactivate")} disabled={busy === k.id} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400">
                        <RotateCcw className="h-3.5 w-3.5" /> Réactiver
                      </button>
                    )}
                    {k.status === "USED" && <span className="text-xs text-zinc-600">{k.usedAt ? new Date(k.usedAt).toLocaleDateString("fr-FR") : "—"}</span>}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Aucune clé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
