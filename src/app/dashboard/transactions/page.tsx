"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  fees: number;
  netAmount: number;
  payerName: string | null;
  payerEmail: string | null;
  description: string | null;
  paymentMethod: string | null;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" }> = {
  SUCCEEDED: { label: "Réussi", variant: "success" },
  PENDING: { label: "En attente", variant: "warning" },
  PROCESSING: { label: "En cours", variant: "info" },
  AUTHORIZED: { label: "Autorisé", variant: "info" },
  FAILED: { label: "Échoué", variant: "error" },
  CANCELLED: { label: "Annulé", variant: "error" },
  REFUNDED: { label: "Remboursé", variant: "warning" },
};

const methodLabels: Record<string, string> = {
  CARD: "Carte bancaire",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  REVOLUT_PAY: "Revolut Pay",
  PAYPAL: "PayPal",
  BANK_TRANSFER: "Virement",
  OPEN_BANKING: "Open Banking",
  SEPA: "SEPA",
};

type StatusFilter = "ALL" | "SUCCEEDED" | "PENDING" | "FAILED";
type TypeFilter = "ALL" | "PAYIN" | "PAYOUT";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  useEffect(() => {
    apiFetch("/api/transactions")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (tx.payerName?.toLowerCase().includes(q)) ||
          (tx.payerEmail?.toLowerCase().includes(q)) ||
          (tx.description?.toLowerCase().includes(q)) ||
          tx.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, search, statusFilter, typeFilter]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  const handleExport = () => {
    window.open("/api/transactions/export", "_blank");
  };

  const totalFiltered = filtered.reduce(
    (acc, tx) => {
      if (tx.type === "PAYIN" && tx.status === "SUCCEEDED") acc.in += tx.amount;
      if (tx.type === "PAYOUT") acc.out += tx.amount;
      return acc;
    },
    { in: 0, out: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Transactions
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {transactions.length} transaction{transactions.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="self-start sm:self-auto">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-emerald-500/10">
          <p className="text-xs text-zinc-500">Total entrant</p>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmt(totalFiltered.in)}</p>
        </Card>
        <Card className="p-4 border-orange-500/10">
          <p className="text-xs text-zinc-500">Total sortant</p>
          <p className="text-lg font-bold text-orange-400 mt-1">{fmt(totalFiltered.out)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-zinc-300 focus:border-brand-500/50 focus:outline-none"
          >
            <option value="ALL">Tous statuts</option>
            <option value="SUCCEEDED">Réussi</option>
            <option value="PENDING">En attente</option>
            <option value="FAILED">Échoué</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-zinc-300 focus:border-brand-500/50 focus:outline-none"
          >
            <option value="ALL">Tous types</option>
            <option value="PAYIN">Paiements</option>
            <option value="PAYOUT">Retraits</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={search || statusFilter !== "ALL" || typeFilter !== "ALL" ? "Aucun résultat" : "Aucune transaction"}
            description={
              search
                ? "Aucune transaction ne correspond à votre recherche."
                : "Vos paiements reçus et retraits apparaîtront ici."
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Effacer la recherche
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="divide-y divide-white/[0.04] sm:hidden">
              {filtered.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                        tx.type === "PAYIN" ? "bg-emerald-500/10" : "bg-orange-500/10"
                      }`}
                    >
                      {tx.type === "PAYIN" ? (
                        <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-orange-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {tx.payerName || tx.payerEmail || (tx.type === "PAYOUT" ? "Retrait" : "Paiement")}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {" · "}
                        {methodLabels[tx.paymentMethod || ""] || tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === "PAYIN" ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {tx.type === "PAYIN" ? "+" : "-"}
                      {fmt(tx.amount)}
                    </p>
                    <Badge variant={statusMap[tx.status]?.variant || "default"} className="mt-1">
                      {statusMap[tx.status]?.label || tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                    <th className="px-6 py-3.5 font-medium">Date</th>
                    <th className="px-6 py-3.5 font-medium">Type</th>
                    <th className="px-6 py-3.5 font-medium">Méthode</th>
                    <th className="px-6 py-3.5 font-medium">De</th>
                    <th className="px-6 py-3.5 font-medium text-right">Montant</th>
                    <th className="px-6 py-3.5 font-medium text-right">Frais</th>
                    <th className="px-6 py-3.5 font-medium text-right">Net</th>
                    <th className="px-6 py-3.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-zinc-300 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-md ${
                              tx.type === "PAYIN" ? "bg-emerald-500/10" : "bg-orange-500/10"
                            }`}
                          >
                            {tx.type === "PAYIN" ? (
                              <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 text-orange-400" />
                            )}
                          </div>
                          <span className="text-zinc-300">
                            {tx.type === "PAYIN" ? "Paiement reçu" : "Retrait"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {methodLabels[tx.paymentMethod || ""] || "—"}
                      </td>
                      <td className="px-6 py-4 text-zinc-300">
                        {tx.payerName || tx.payerEmail || "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-white">
                        {tx.type === "PAYIN" ? "+" : "-"}
                        {fmt(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-zinc-500">
                        {tx.fees > 0 ? `-${fmt(tx.fees)}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-300">
                        {tx.netAmount > 0 ? fmt(tx.netAmount) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusMap[tx.status]?.variant || "default"}>
                          {statusMap[tx.status]?.label || tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
