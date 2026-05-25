"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  payerEmail: string | null;
  payerName: string | null;
  paymentMethod: string | null;
  providerTransactionId: string | null;
  receiptSent: boolean;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(attempt = 0) {
      try {
        const r = await apiFetch("/api/admin/transactions?limit=100");
        if (cancelled) return;

        if (r.status >= 500 && attempt < 2) {
          await new Promise((res) => setTimeout(res, 1500));
          return load(attempt + 1);
        }

        if (r.status === 403) {
          setError("Acces refuse");
          return;
        }

        if (!r.ok) {
          const data = await r.json().catch(() => null);
          setError(data?.error || `Erreur ${r.status}`);
          return;
        }

        const d = await r.json();
        if (!cancelled) setTransactions(d.transactions || []);
      } catch (e: any) {
        if (cancelled) return;
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 1500));
          return load(attempt + 1);
        }
        setError("Erreur reseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-red-400 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-brand-400 hover:text-brand-300">
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Paiements</h1>
        <p className="text-sm text-zinc-500 mt-1">Tous les paiements de la plateforme</p>
      </div>

      <Card className="overflow-hidden p-0">
        {/* Mobile list */}
        <div className="divide-y divide-white/[0.04] sm:hidden">
          {transactions.map((tx) => (
            <div key={tx.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{fmt(tx.amount)}</p>
                <Badge variant={tx.status === "SUCCEEDED" ? "success" : tx.status === "PENDING" ? "warning" : tx.status === "FAILED" ? "error" : "default"}>
                  {tx.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1 truncate">{tx.payerName || tx.payerEmail || "—"} → {tx.user?.name || "—"}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-500">Aucun paiement</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Destinataire</th>
                <th className="px-6 py-3 font-medium">Montant</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium">Methode</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{tx.payerName || tx.payerEmail || "—"}</td>
                  <td className="px-6 py-4 text-zinc-400">{tx.user?.name || tx.user?.email || "—"}</td>
                  <td className="px-6 py-4 font-medium text-white">{fmt(tx.amount)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={tx.status === "SUCCEEDED" ? "success" : tx.status === "PENDING" ? "warning" : tx.status === "FAILED" ? "error" : "default"}>
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{tx.paymentMethod || "—"}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Aucun paiement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
