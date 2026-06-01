"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Trash2 } from "lucide-react";

interface BankAccount {
  id: string;
  ibanMasked: string;
  bic: string;
  holderName: string;
  isDefault: boolean;
  status: string;
  createdAt: string;
}

export default function BankAccountPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [holderName, setHolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAccounts = () => {
    apiFetch("/api/bank-accounts").then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
  };

  useEffect(() => { loadAccounts(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce compte bancaire ?")) return;
    const res = await apiFetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
    if (res.ok) loadAccounts();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban: iban.replace(/\s/g, ""), bic, holderName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setShowForm(false);
      setIban("");
      setBic("");
      setHolderName("");
      loadAccounts();
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Comptes bancaires</h1>
          <p className="text-sm text-zinc-400">Gérez vos comptes pour les retraits</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Annuler" : "Ajouter un compte"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardTitle className="mb-4">Nouveau compte bancaire</CardTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="holder" label="Titulaire" placeholder="Jean Dupont" value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
            <Input id="iban" label="IBAN" placeholder="FR76 3000 6000 0112 3456 7890 189" value={iban} onChange={(e) => setIban(e.target.value)} required />
            <Input id="bic" label="BIC" placeholder="BNPAFRPP" value={bic} onChange={(e) => setBic(e.target.value)} required />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? "Ajout..." : "Ajouter"}</Button>
          </form>
        </Card>
      )}

      {accounts.length === 0 && !showForm ? (
        <Card className="text-center py-12">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
          <p className="text-zinc-400">Aucun compte bancaire enregistré</p>
          <p className="mt-1 text-xs text-zinc-500">Ajoutez un compte pour pouvoir effectuer des retraits</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <Card key={a.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{a.holderName}</p>
                <p className="text-sm text-zinc-400 font-mono">{a.ibanMasked}</p>
              </div>
              <div className="flex items-center gap-2">
                {a.isDefault && <Badge variant="success">Principal</Badge>}
                <Badge variant={a.status === "VERIFIED" ? "success" : "warning"}>
                  {a.status === "VERIFIED" ? "Vérifié" : "En attente"}
                </Badge>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="ml-2 rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
