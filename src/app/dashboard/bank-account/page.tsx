"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Shield, AlertCircle } from "lucide-react";

interface BankAccount {
  id: string;
  ibanMasked: string;
  holderName: string;
  bankName: string | null;
  country: string;
  currency: string;
  isDefault: boolean;
  status: string;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "error" }> = {
  VERIFIED: { label: "Vérifié", variant: "success" },
  PENDING: { label: "En attente", variant: "warning" },
  REJECTED: { label: "Rejeté", variant: "error" },
};

export default function BankAccountPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [iban, setIban] = useState("");
  const [holderName, setHolderName] = useState("");
  const [country, setCountry] = useState("FR");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAccounts = () => {
    apiFetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const cleanIban = iban.replace(/\s/g, "").toUpperCase();

      const res = await apiFetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban: cleanIban, holderName, country, currency }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'ajout");
        return;
      }

      setSuccess("Compte bancaire ajouté et vérifié avec succès.");
      setShowForm(false);
      setIban("");
      setHolderName("");
      loadAccounts();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce compte bancaire ?")) return;
    const res = await apiFetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Erreur lors de la suppression");
      return;
    }
    loadAccounts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Comptes bancaires
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gérez vos comptes pour recevoir vos retraits
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? "Annuler" : (
            <>
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter
            </>
          )}
        </Button>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-500/10 bg-brand-500/[0.03] p-4">
        <Shield className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-zinc-300">Vos données bancaires sont sécurisées</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            L'IBAN est transmis directement à notre prestataire de paiement agréé. Nous ne stockons jamais votre IBAN complet.
          </p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-brand-500/10 p-2.5">
              <Building2 className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <CardTitle className="text-base">Nouveau compte bancaire</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Ajoutez un IBAN pour recevoir vos retraits
              </CardDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Titulaire du compte
              </label>
              <input
                type="text"
                placeholder="Jean Dupont"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
                className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">IBAN</label>
              <input
                type="text"
                placeholder="FR76 3000 6000 0112 3456 7890 189"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                required
                className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white font-mono placeholder:text-zinc-500 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="text-xs text-zinc-500 mt-1">Format : FR76 XXXX XXXX XXXX XXXX XXXX XXX</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Pays</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="FR">France</option>
                  <option value="BE">Belgique</option>
                  <option value="DE">Allemagne</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                  <option value="NL">Pays-Bas</option>
                  <option value="LU">Luxembourg</option>
                  <option value="PT">Portugal</option>
                  <option value="AT">Autriche</option>
                  <option value="IE">Irlande</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Devise</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - Livre Sterling</option>
                  <option value="CHF">CHF - Franc Suisse</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Vérification en cours..." : "Ajouter le compte bancaire"}
            </Button>
          </form>
        </Card>
      )}

      {/* Accounts list */}
      {accounts.length === 0 && !showForm ? (
        <Card className="text-center py-12 px-6">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
          <p className="text-zinc-400">Aucun compte bancaire enregistré</p>
          <p className="mt-1 text-xs text-zinc-500">
            Ajoutez un compte pour pouvoir effectuer des retraits
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const st = statusMap[a.status] || statusMap.PENDING;
            return (
              <Card key={a.id} className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <Building2 className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{a.holderName}</p>
                      <p className="text-sm text-zinc-400 font-mono mt-0.5">{a.ibanMasked}</p>
                      {a.bankName && (
                        <p className="text-xs text-zinc-500 mt-0.5">{a.bankName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.isDefault && <Badge variant="info">Principal</Badge>}
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="ml-1 rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
