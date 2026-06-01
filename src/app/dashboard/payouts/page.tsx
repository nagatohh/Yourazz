"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, Building2, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react";

interface BankAccount {
  id: string;
  ibanMasked: string;
  holderName: string;
  bankName: string | null;
  isDefault: boolean;
  status: string;
}

interface Payout {
  id: string;
  amount: number;
  fees: number;
  netAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  estimatedArrival: string | null;
  bankAccount: { ibanMasked: string; holderName: string };
}

interface WalletInfo {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  stripeConnected: boolean;
  payoutsEnabled: boolean;
}

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "error" | "info"; icon: typeof CheckCircle2 }> = {
  PENDING: { label: "En attente", variant: "warning", icon: Clock },
  PROCESSING: { label: "En cours", variant: "info", icon: Clock },
  PAID: { label: "Payé", variant: "success", icon: CheckCircle2 },
  FAILED: { label: "Échoué", variant: "error", icon: AlertCircle },
  CANCELLED: { label: "Annulé", variant: "error", icon: AlertCircle },
};

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    apiFetch("/api/payouts/history").then((r) => r.json()).then((d) => setPayouts(d.payouts || []));
    apiFetch("/api/bank-accounts").then((r) => r.json()).then((d) => {
      const verified = (d.accounts || []).filter((a: BankAccount) => a.status === "VERIFIED");
      setBanks(verified);
      const def = verified.find((a: BankAccount) => a.isDefault);
      if (def) setSelectedBank(def.id);
      else if (verified.length) setSelectedBank(verified[0].id);
    });
    apiFetch("/api/wallet").then((r) => r.json()).then((d) => {
      if (!d.error) setWallet(d);
    });
  };

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountCents) || amountCents < 500) {
        setError("Montant minimum : 5,00 EUR");
        return;
      }
      if (!selectedBank) {
        setError("Sélectionnez un compte bancaire");
        return;
      }

      const res = await apiFetch("/api/payouts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountCents, bankAccountId: selectedBank }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors du retrait");
        return;
      }

      setSuccess("Retrait initié avec succès. Vous recevrez les fonds sous 2-3 jours ouvrés.");
      setAmount("");
      loadData();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleMaxAmount = () => {
    if (wallet && wallet.availableBalance > 0) {
      setAmount((wallet.availableBalance / 100).toFixed(2));
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  const totalPaid = payouts.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Retraits</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Transférez vos fonds vers votre compte bancaire
        </p>
      </div>

      {/* Balance overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 border-brand-500/10 bg-gradient-to-br from-brand-500/[0.04] to-transparent">
          <p className="text-xs text-zinc-500">Disponible au retrait</p>
          <p className="text-xl font-bold text-white mt-1">
            {wallet ? fmt(wallet.availableBalance) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-500">En attente de clearing</p>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {wallet ? fmt(wallet.pendingBalance) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-500">Total retiré</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(totalPaid)}</p>
        </Card>
      </div>

      {/* Withdraw form */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-brand-500/10 p-2.5">
            <Banknote className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <CardTitle className="text-base">Nouveau retrait</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Minimum 5,00 EUR. Traitement sous 2-3 jours ouvrés.
            </CardDescription>
          </div>
        </div>

        {banks.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <Building2 className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400 mb-3">
              Ajoutez un compte bancaire pour effectuer des retraits
            </p>
            <a href="/dashboard/bank-account">
              <Button variant="outline" size="sm">
                Ajouter un IBAN <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        ) : (
          <form onSubmit={handlePayout} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Montant (EUR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="5"
                    placeholder="100.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {wallet && wallet.availableBalance > 0 && (
                    <button
                      type="button"
                      onClick={handleMaxAmount}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-brand-400 hover:text-brand-300"
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Vers le compte
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.holderName} — {b.ibanMasked}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {amount && parseFloat(amount) >= 5 && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Montant demandé</span>
                  <span className="text-white font-medium">
                    {parseFloat(amount).toFixed(2)} EUR
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-zinc-500">Frais</span>
                  <span className="text-zinc-400">0,00 EUR</span>
                </div>
                <div className="border-t border-white/[0.06] mt-3 pt-3 flex justify-between text-sm">
                  <span className="text-zinc-300 font-medium">Vous recevrez</span>
                  <span className="text-white font-bold">
                    {parseFloat(amount).toFixed(2)} EUR
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Traitement..." : "Effectuer le retrait"}
            </Button>
          </form>
        )}
      </Card>

      {/* History */}
      <Card className="overflow-hidden p-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
          <CardTitle className="text-base">Historique des retraits</CardTitle>
        </div>
        {payouts.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-zinc-500">
            Aucun retrait effectué pour le moment
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="divide-y divide-white/[0.04] sm:hidden">
              {payouts.map((p) => {
                const cfg = statusConfig[p.status] || statusConfig.PENDING;
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Building2 className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{fmt(p.amount)}</p>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                          {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {" · "}
                          {p.bankAccount.ibanMasked}
                        </p>
                      </div>
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                    <th className="px-6 py-3.5 font-medium">Date</th>
                    <th className="px-6 py-3.5 font-medium">Montant</th>
                    <th className="px-6 py-3.5 font-medium">Frais</th>
                    <th className="px-6 py-3.5 font-medium">Vers</th>
                    <th className="px-6 py-3.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => {
                    const cfg = statusConfig[p.status] || statusConfig.PENDING;
                    return (
                      <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-zinc-300">
                          {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 font-medium text-white">{fmt(p.amount)}</td>
                        <td className="px-6 py-4 text-zinc-500">
                          {p.fees > 0 ? fmt(p.fees) : "Gratuit"}
                        </td>
                        <td className="px-6 py-4 text-zinc-300">
                          <span>{p.bankAccount.holderName}</span>
                          <span className="text-zinc-500 ml-2 text-xs">{p.bankAccount.ibanMasked}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
