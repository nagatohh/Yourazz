"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

// Composant Stripe (SDK navigateur) : chargé uniquement côté client.
const ConnectOnboarding = dynamic(
  () => import("@/components/dashboard/connect-onboarding").then((m) => m.ConnectOnboarding),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2 py-6 justify-center text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la vérification…
      </div>
    ),
  },
);

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [openingHosted, setOpeningHosted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAccounts = () =>
    apiFetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));

  // Resynchronise le statut Connect depuis Stripe (après l'onboarding embarqué
  // ou un retour de la page hébergée), sans attendre le webhook.
  const syncStatus = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch("/api/stripe/connect/status");
      const d = await res.json();
      if (d.payoutsEnabled) {
        setSuccess("Votre compte bancaire est connecté et prêt à recevoir des retraits.");
        setError("");
      } else if (d.connectStatus === "pending_onboarding" || (d.currentlyDue?.length ?? 0) > 0) {
        setError("Stripe a encore besoin d'informations. Reprenez la vérification pour la terminer.");
      }
    } catch {
      /* silencieux : on rechargera juste la liste */
    } finally {
      setSyncing(false);
      loadAccounts();
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("onboarding") === "return") {
      syncStatus();
      window.history.replaceState({}, "", "/dashboard/bank-account");
    } else {
      loadAccounts();
    }
  }, []);

  // Repli : page d'onboarding hébergée par Stripe (si le composant embarqué échoue).
  const handleHostedFallback = async () => {
    setError("");
    setOpeningHosted(true);
    try {
      const res = await apiFetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Impossible de démarrer la connexion.");
        setOpeningHosted(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau");
      setOpeningHosted(false);
    }
  };

  const handleExit = () => {
    setShowOnboarding(false);
    syncStatus();
  };

  const hasVerified = accounts.some((a) => a.status === "VERIFIED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Compte bancaire</h1>
        <p className="text-sm text-zinc-500 mt-1">Connectez votre compte pour recevoir vos retraits</p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-500/10 bg-brand-500/[0.03] p-4">
        <Shield className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-zinc-300">Vérification sécurisée par Stripe — sans quitter Yourazz</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pour les particuliers, c&apos;est rapide : nom, date de naissance et adresse suffisent en général.
            Yourazz ne voit jamais votre IBAN complet ni vos pièces d&apos;identité.
          </p>
        </div>
      </div>

      {syncing && (
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
          <Loader2 className="h-4 w-4 text-brand-400 animate-spin" />
          <p className="text-sm text-zinc-400">Vérification de votre statut…</p>
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

      {/* Onboarding embarqué */}
      {showOnboarding ? (
        <Card className="p-4 sm:p-6">
          <ConnectOnboarding onExit={handleExit} />
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <button
              onClick={handleHostedFallback}
              disabled={openingHosted}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              {openingHosted ? "Ouverture…" : "Un problème ? Ouvrir la page Stripe à la place"}
            </button>
            <button
              onClick={() => setShowOnboarding(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Fermer
            </button>
          </div>
        </Card>
      ) : accounts.length === 0 ? (
        <Card className="p-6 sm:p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
            <Building2 className="h-6 w-6 text-brand-400" />
          </div>
          <CardTitle className="text-base">Connectez votre compte bancaire</CardTitle>
          <CardDescription className="text-xs mt-1 max-w-md mx-auto">
            Quelques informations à vérifier (2 minutes), directement ici. Cela active vos retraits.
          </CardDescription>
          <Button onClick={() => setShowOnboarding(true)} className="mt-5">
            Commencer la vérification
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
            <Button onClick={() => setShowOnboarding(true)} variant="outline" size="sm">
              {hasVerified ? "Mettre à jour mes informations" : "Terminer la vérification"}
            </Button>
            {!hasVerified && (
              <p className="text-xs text-amber-400">
                Vérification incomplète : terminez-la pour activer vos retraits.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
