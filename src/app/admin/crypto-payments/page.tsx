"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bitcoin, Check, X, Copy, KeyRound, AlertTriangle, Loader2 } from "lucide-react";

interface PaymentRow {
  id: string;
  currency: string;
  address: string;
  txid: string;
  amount: string | null;
  status: "PENDING" | "RECEIVED" | "REJECTED";
  note: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
  activationKey: { id: string; key: string; status: string } | null;
}

function PaymentStatus({ status }: { status: PaymentRow["status"] }) {
  if (status === "RECEIVED") return <Badge variant="success">Reçu</Badge>;
  if (status === "REJECTED") return <Badge variant="error">Refusé</Badge>;
  return <Badge variant="warning">En attente</Badge>;
}

export default function AdminCryptoPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    apiFetch("/api/admin/crypto-payments")
      .then((r) => {
        if (r.status === 403) throw new Error("Accès refusé");
        if (!r.ok) throw new Error("Erreur de chargement");
        return r.json();
      })
      .then((d) => setPayments(d.payments || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, action: "confirm" | "reject") => {
    if (action === "reject" && !confirm("Refuser ce paiement ?")) return;
    setBusy(id);
    setIssuedKey(null);
    try {
      const res = await fetch(`/api/admin/crypto-payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Échec de l'opération");
        return;
      }
      if (action === "confirm" && data.key) {
        setIssuedKey({ id, key: data.key });
      }
      load();
    } catch {
      alert("Erreur réseau");
    } finally {
      setBusy(null);
    }
  };

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponible */
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

  const pending = payments.filter((p) => p.status === "PENDING");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Bitcoin className="h-6 w-6 text-brand-400" /> Paiements crypto
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Vérifiez les paiements Litecoin et émettez les clés d&apos;activation.
          </p>
        </div>
        <Link href="/admin/activation-keys">
          <Button variant="outline" size="sm">
            <KeyRound className="h-4 w-4" /> Clés
          </Button>
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
          <p className="text-sm text-amber-300">
            {pending.length} paiement(s) en attente de vérification.
          </p>
        </div>
      )}

      {/* Clé fraîchement émise */}
      {issuedKey && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-emerald-400" /> Clé d&apos;activation émise
          </CardTitle>
          <p className="mt-1 text-xs text-zinc-400">
            Transmettez cette clé à l&apos;utilisateur. Elle n&apos;est utilisable qu&apos;une seule fois.
          </p>
          <div className="mt-3 flex items-stretch gap-2">
            <code className="flex-1 break-all rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-emerald-300">
              {issuedKey.key}
            </code>
            <button
              onClick={() => copyKey(issuedKey.key)}
              className="flex flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              aria-label="Copier la clé"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="text-base">Demandes ({payments.length})</CardTitle>
        </div>

        {/* Mobile */}
        <div className="mt-3 divide-y divide-white/[0.04] sm:hidden">
          {payments.map((p) => (
            <div key={p.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm text-zinc-300">{p.user?.email || "—"}</p>
                <PaymentStatus status={p.status} />
              </div>
              <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">{p.txid}</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">
                {new Date(p.createdAt).toLocaleString("fr-FR")}
                {p.amount ? ` · ${p.amount} LTC` : ""}
              </p>
              {p.status === "PENDING" && (
                <div className="mt-2.5 flex gap-2">
                  <Button size="sm" disabled={busy === p.id} onClick={() => review(p.id, "confirm")}>
                    {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirmer
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => review(p.id, "reject")}>
                    <X className="h-3.5 w-3.5" /> Refuser
                  </Button>
                </div>
              )}
              {p.activationKey && (
                <p className="mt-2 font-mono text-[11px] text-emerald-400/80">Clé : {p.activationKey.key}</p>
              )}
            </div>
          ))}
          {payments.length === 0 && <p className="px-4 py-8 text-center text-zinc-500">Aucune demande</p>}
        </div>

        {/* Desktop */}
        <div className="mt-4 hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                <th className="px-6 py-3 font-medium">Utilisateur</th>
                <th className="px-6 py-3 font-medium">TXID</th>
                <th className="px-6 py-3 font-medium">Montant</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <p className="text-zinc-300">{p.user?.name || "—"}</p>
                    <p className="text-xs text-zinc-500">{p.user?.email}</p>
                  </td>
                  <td className="max-w-[220px] px-6 py-4">
                    <span className="block truncate font-mono text-xs text-zinc-400" title={p.txid}>{p.txid}</span>
                    {p.activationKey && (
                      <span className="mt-1 block font-mono text-[11px] text-emerald-400/80" title={p.activationKey.key}>
                        Clé : {p.activationKey.key}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{p.amount ? `${p.amount} LTC` : "—"}</td>
                  <td className="px-6 py-4"><PaymentStatus status={p.status} /></td>
                  <td className="px-6 py-4 text-zinc-500">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    {p.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy === p.id} onClick={() => review(p.id, "confirm")}>
                          {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirmer
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => review(p.id, "reject")}>
                          <X className="h-3.5 w-3.5" /> Refuser
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">{p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString("fr-FR") : "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Aucune demande</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
