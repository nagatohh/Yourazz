"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BankAccount {
  id: string;
  ibanMasked: string;
  holderName: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  bankAccount: { ibanMasked: string };
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/payouts/history").then((r) => r.json()).then((d) => setPayouts(d.payouts || []));
    fetch("/api/bank-accounts").then((r) => r.json()).then((d) => {
      setBanks(d.accounts || []);
      if (d.accounts?.length) setSelectedBank(d.accounts[0].id);
    });
  }, []);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/payouts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(parseFloat(amount) * 100), bankAccountId: selectedBank }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("Retrait effectué avec succès");
      setAmount("");
      fetch("/api/payouts/history").then((r) => r.json()).then((d) => setPayouts(d.payouts || []));
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Retraits</h1>
        <p className="text-sm text-zinc-400">Transférez vos fonds vers votre compte bancaire</p>
      </div>

      <Card>
        <CardTitle className="mb-4">Nouveau retrait</CardTitle>
        {banks.length === 0 ? (
          <p className="text-sm text-zinc-400">Ajoutez un compte bancaire d&apos;abord dans l&apos;onglet &quot;Compte bancaire&quot;</p>
        ) : (
          <form onSubmit={handlePayout} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                id="amount"
                label="Montant (EUR)"
                type="number"
                step="0.01"
                min="1"
                placeholder="100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Compte</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.holderName} — {b.ibanMasked}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Envoi..." : "Retirer"}</Button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="px-6 pt-6">
          <CardTitle>Historique</CardTitle>
        </div>
        {payouts.length === 0 ? (
          <div className="p-6 text-sm text-zinc-400">Aucun retrait</div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Montant</th>
                  <th className="px-6 py-3 font-medium">Vers</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-800/50">
                    <td className="px-6 py-4 text-zinc-300">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4 font-medium text-white">{fmt(p.amount)}</td>
                    <td className="px-6 py-4 text-zinc-300">{p.bankAccount.ibanMasked}</td>
                    <td className="px-6 py-4">
                      <Badge variant={p.status === "PAID" ? "success" : "info"}>
                        {p.status === "PAID" ? "Payé" : "En cours"}
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
