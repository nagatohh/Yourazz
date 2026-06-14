"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Copy, Check, AlertCircle } from "lucide-react";

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");

  const load = () => {
    apiFetch("/api/keys")
      .then((r) => r.json())
      .then((d) => { if (d.keys) setKeys(d.keys); if (d.error) setError(d.error); })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const create = async () => {
    setError("");
    setCreating(true);
    try {
      const res = await apiFetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setNewKey(data.key);
      setName("");
      load();
    } catch {
      setError("Erreur réseau");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setError("");
    const res = await apiFetch("/api/keys/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setKeys((k) => k.filter((x) => x.id !== id));
    } else {
      const d = await res.json();
      setError(d.error || "Erreur");
    }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (error && !keys.length && !newKey) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5"><Key className="h-5 w-5 text-amber-400" /></div>
          <div>
            <CardTitle className="text-base">Clés API</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {keys.length}/5 clé{keys.length > 1 ? "s" : ""} active{keys.length > 1 ? "s" : ""}
            </CardDescription>
          </div>
        </div>
      </div>

      {newKey && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 space-y-2">
          <p className="text-xs text-amber-400 font-semibold">Clé créée — copiez-la maintenant, elle ne sera plus visible :</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-black/40 px-3 py-2 text-xs text-white font-mono break-all select-all">
              {newKey}
            </code>
            <Button size="sm" variant="outline" onClick={copyKey}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setNewKey(null)} className="text-xs text-zinc-500">
            Fermer
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-white">{k.name}</p>
                <Badge variant="default" className="font-mono text-[10px]">{k.prefix}…</Badge>
              </div>
              <p className="text-[11px] text-zinc-600">
                Créée le {new Date(k.createdAt).toLocaleDateString("fr-FR")}
                {k.lastUsedAt && ` · Dernière utilisation ${new Date(k.lastUsedAt).toLocaleDateString("fr-FR")}`}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => revoke(k.id)} className="text-red-400 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {keys.length < 5 && (
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Nom de la clé (optionnel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-brand-500/50 focus:outline-none"
          />
          <Button onClick={create} disabled={creating} size="sm">
            <Plus className="h-3.5 w-3.5" />
            {creating ? "…" : "Créer"}
          </Button>
        </div>
      )}
    </Card>
  );
}
