"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
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
  CARD: "Carte",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  BANK_TRANSFER: "Virement",
  OPEN_BANKING: "Open Banking",
  SEPA: "SEPA",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  const handleExport = () => {
    window.open("/api/transactions/export", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-zinc-400">Historique de tous vos mouvements</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">Aucune transaction pour le moment</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Méthode</th>
                  <th className="px-6 py-3 font-medium">De</th>
                  <th className="px-6 py-3 font-medium">Montant</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-6 py-4 text-zinc-300">
                      {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{tx.type === "PAYIN" ? "Paiement reçu" : tx.type === "PAYOUT" ? "Retrait" : tx.type}</td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">{methodLabels[tx.paymentMethod || ""] || "—"}</td>
                    <td className="px-6 py-4 text-zinc-300">{tx.payerName || tx.payerEmail || "—"}</td>
                    <td className="px-6 py-4 font-medium text-white">{tx.type === "PAYIN" ? "+" : "-"}{fmt(tx.amount)}</td>
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
        )}
      </Card>
    </div>
  );
}
