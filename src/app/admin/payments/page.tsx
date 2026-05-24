"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    fetch("/api/admin/transactions?limit=100")
      .then((r) => { if (!r.ok) throw new Error("Accès refusé"); return r.json(); })
      .then((d) => setTransactions(d.transactions || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Paiements</h1>
        <p className="text-sm text-zinc-500 mt-1">Tous les paiements de la plateforme</p>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="text-xs text-brand-400 hover:text-brand-300">Réessayer</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Destinataire</th>
                  <th className="px-6 py-3 font-medium">Montant</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Reçu</th>
                  <th className="px-6 py-3 font-medium">Stripe ID</th>
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
                    <td className="px-6 py-4">
                      {tx.receiptSent ? <Badge variant="success">Envoyé</Badge> : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 text-xs font-mono">{tx.providerTransactionId?.slice(0, 20) || "—"}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Aucun paiement</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
