"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

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
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAccounts = () =>
    apiFetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const onboarding = params.get("onboarding");

    if (onboarding === "return") {
      // Retour de l'onboarding Stripe : on resynchronise le statut sans attendre
      // le webhook, puis on recharge les comptes.
      setSyncing(true);
      apiFetch("/api/stripe/connect/status")
        .then((r) => r.json())
        .then((d) => {
          if (d.payoutsEnabled) {
            setSuccess("Votre compte bancaire est connecté et prêt à recevoir des retraits.");
          } else if (d.connectStatus === "pending_onboarding" || (d.currentlyDue?.length ?? 0) > 0) {
            setError("Stripe a encore besoin d'informations avant d'activer vos retraits. Reprenez la connexion.");
          }
        })
        .catch(() => {})
        .finally(() => {
          setSyncing(false);
          loadAccounts();
          window.history.replaceState({}, "", "/dashboard/bank-account");
        });
    } else {
      loadAccounts();
      if (onboarding === "refresh") {
        setError("La connexion a été interrompue. Relancez-la pour terminer.");
        window.history.replaceState({}, "", "/dashboard/bank-account");
      }
    }
  }, []);

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      const res = await apiFetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Impossible de démarrer la connexion.");
        setConnecting(false);
        return;
      }
      // Redirection vers l'onboarding hébergé par Stripe
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau");
      setConnecting(false);
    }
  };

  const hasVerified = accounts.some((a) => a.status === "VERIFIED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Compte bancaire
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Connectez votre compte pour recevoir vos retraits
        </p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-500/10 bg-brand-500/[0.03] p-4">
        <Shield className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-zinc-300">Connexion sécurisée via Stripe</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Vos informations bancaires et votre identité sont saisies directement sur la
            page sécurisée de Stripe (notre prestataire de paiement agréé). Yourazz ne voit
            jamais votre IBAN complet ni vos pièces d&apos;identité.
          </p>
        </div>
      </div>

      {syncing && (
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
          <Loader2 className="h-4 w-4 text-brand-400 animate-spin" />
          <p className="text-sm text-zinc-400">Vérification de votre connexion Stripe…</p>
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

      {/* Connect / accounts */}
      {accounts.length === 0 ? (
        <Card className="p-6 sm:p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
            <Building2 className="h-6 w-6 text-brand-400" />
          </div>
          <CardTitle className="text-base">Connectez votre compte bancaire</CardTitle>
          <CardDescription className="text-xs mt-1 max-w-md mx-auto">
            Vous serez redirigé vers Stripe pour renseigner votre identité et votre IBAN.
            L&apos;opération prend quelques minutes et active vos retraits.
          </CardDescription>
          <Button onClick={handleConnect} disabled={connecting} className="mt-5">
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Redirection…
              </>
            ) : (
              <>
                Connecter via Stripe <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </Card>
      ) : (
        <>
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
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {a.bankName ? `${a.bankName} · ` : ""}
                          {a.country} · {a.currency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.isDefault && <Badge variant="info">Principal</Badge>}
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleConnect} variant="outline" size="sm" disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Redirection…
                </>
              ) : (
                <>
                  {hasVerified ? "Mettre à jour sur Stripe" : "Terminer la connexion"}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
            {!hasVerified && (
              <p className="text-xs text-amber-400">
                Connexion incomplète : terminez-la sur Stripe pour activer vos retraits.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
