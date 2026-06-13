"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  Gem,
  AlertTriangle,
  Loader2,
} from "lucide-react";

type Plan = "PRO" | "BUSINESS";

interface Submission {
  id: string;
  plan: Plan;
  reference: string | null;
  txid: string;
  amount: string | null;
  status: "PENDING" | "RECEIVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  activationKey: { status: string; plan: Plan } | null;
}

interface Props {
  plan: Plan;
  priceEur: number;
  address: string;
  amount: string;
  label: string;
  configured: boolean;
  qr: string | null;
  currentPlan: string;
  isAdmin: boolean;
}

const TXID_RE = /^[0-9a-fA-F]{64}$/;

const PLAN_UI: Record<Plan, { name: string; ring: string; text: string; bg: string; gradient: string }> = {
  PRO: {
    name: "Pro",
    ring: "border-brand-500/30",
    text: "text-brand-400",
    bg: "bg-brand-500/10",
    gradient: "from-brand-500/[0.07]",
  },
  BUSINESS: {
    name: "Business",
    ring: "border-amber-500/30",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    gradient: "from-amber-500/[0.07]",
  },
};

function StatusBadge({ status }: { status: Submission["status"] }) {
  if (status === "RECEIVED") return <Badge variant="success">Paiement reçu</Badge>;
  if (status === "REJECTED") return <Badge variant="error">Refusé</Badge>;
  return <Badge variant="warning">En attente de vérification</Badge>;
}

export function CryptoPaymentClient({ plan, priceEur, address, amount, label, configured, qr, currentPlan, isAdmin }: Props) {
  const ui = PLAN_UI[plan];
  const [txid, setTxid] = useState("");
  const [declaredAmount, setDeclaredAmount] = useState(amount || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadSubmissions = () => {
    apiFetch("/api/access/crypto/submit")
      .then((r) => (r.ok ? r.json() : { payments: [] }))
      .then((d) => setSubmissions(d.payments || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponible */
    }
  };

  const txidValid = TXID_RE.test(txid.trim());
  const priceEurStr = (priceEur / 100).toFixed(2).replace(".", ",");
  const alreadyOnPlan = isAdmin || currentPlan === plan || currentPlan === "BUSINESS";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!txidValid) {
      setError("Le TXID doit comporter 64 caractères hexadécimaux.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/access/crypto/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, txid: txid.trim(), amount: declaredAmount.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Échec de la soumission.");
        return;
      }
      setSuccess("TXID soumis. Votre paiement sera vérifié sous peu.");
      setTxid("");
      loadSubmissions();
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-[#0a0a0a] px-4 py-10 sm:py-14">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className={`absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full ${plan === "BUSINESS" ? "bg-[radial-gradient(circle,rgba(245,158,11,0.06),transparent_65%)]" : "bg-[radial-gradient(circle,rgba(220,38,38,0.07),transparent_65%)]"}`} />
      </div>

      <div className="relative mx-auto w-full max-w-2xl space-y-6">
        {/* En-tête */}
        <div className="text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${ui.bg} border ${ui.ring}`}>
            <Gem className={`h-7 w-7 ${ui.text}`} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Abonnement</h1>
            <span className={`rounded-lg border ${ui.ring} ${ui.bg} px-2.5 py-0.5 text-sm font-bold ${ui.text}`}>{ui.name}</span>
          </div>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Réglez votre abonnement {ui.name} en Litecoin (LTC), soumettez votre TXID,
            puis activez votre plan avec la clé fournie.
          </p>
        </div>

        {/* Sélecteur de plan */}
        <div className="flex justify-center gap-2">
          <Link href="/access/crypto?plan=PRO">
            <Button variant={plan === "PRO" ? "default" : "outline"} size="sm">Pro · 7,99 €</Button>
          </Link>
          <Link href="/access/crypto?plan=BUSINESS">
            <Button variant={plan === "BUSINESS" ? "default" : "outline"} size="sm">Business · 19,99 €</Button>
          </Link>
        </div>

        {alreadyOnPlan && (
          <Card className="flex items-center gap-3 border-emerald-500/20 bg-emerald-500/[0.04]">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-300">
                {isAdmin ? "Compte administrateur — accès complet" : `Vous êtes déjà en plan ${currentPlan === "BUSINESS" ? "Business" : "Pro"}`}
              </p>
              <p className="text-xs text-zinc-400">Aucun paiement supplémentaire n&apos;est nécessaire pour ce plan.</p>
            </div>
            <Link href="/dashboard/plan">
              <Button size="sm" variant="outline">Mon plan</Button>
            </Link>
          </Card>
        )}

        {!configured ? (
          <Card className="border-amber-500/20 bg-amber-500/[0.04]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
              <div>
                <CardTitle className="text-base">Paiement temporairement indisponible</CardTitle>
                <CardDescription className="mt-1">
                  L&apos;adresse de réception du plan {ui.name} n&apos;est pas encore configurée.
                  Réessayez plus tard ou contactez le support.
                </CardDescription>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Étape 1 — Payer */}
            <Card className={`space-y-5 bg-gradient-to-br ${ui.gradient} to-transparent`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${ui.bg} text-xs font-bold ${ui.text}`}>1</span>
                  <CardTitle className="text-base">Envoyez le paiement en LTC</CardTitle>
                </div>
                <span className="text-sm text-zinc-400">{priceEurStr} €/mois</span>
              </div>

              <div className="grid gap-5 sm:grid-cols-[auto,1fr] sm:items-center">
                {qr && (
                  <div className="mx-auto rounded-xl bg-white p-3 sm:mx-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="QR code de paiement Litecoin" width={180} height={180} className="h-[180px] w-[180px]" />
                  </div>
                )}

                <div className="space-y-3">
                  {amount && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Montant à envoyer</p>
                      <p className="text-lg font-bold text-white">{amount} LTC</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Adresse de réception ({label})</p>
                    <div className="mt-1.5 flex items-stretch gap-2">
                      <code className="flex-1 break-all rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-zinc-200">
                        {address}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="flex flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                        aria-label="Copier l'adresse"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    {copied && <p className="mt-1 text-xs text-emerald-400">Adresse copiée</p>}
                  </div>
                </div>
              </div>

              <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-zinc-500">
                N&apos;envoyez que du <span className="font-medium text-zinc-300">Litecoin (LTC)</span> à cette adresse.
                Tout autre actif serait définitivement perdu.
              </p>
            </Card>

            {/* Étape 2 — Soumettre le TXID */}
            <Card className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${ui.bg} text-xs font-bold ${ui.text}`}>2</span>
                <CardTitle className="text-base">Soumettez votre identifiant de transaction (TXID)</CardTitle>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="txid" className="block text-sm font-medium text-zinc-300">TXID de la transaction</label>
                  <input
                    id="txid"
                    value={txid}
                    onChange={(e) => setTxid(e.target.value)}
                    placeholder="64 caractères hexadécimaux"
                    autoComplete="off"
                    spellCheck={false}
                    className={`flex h-11 w-full rounded-xl border bg-white/[0.03] px-4 py-2 font-mono text-sm text-white placeholder:text-zinc-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:bg-white/[0.05] ${
                      txid.length === 0
                        ? "border-white/[0.08] focus:border-brand-500/50 focus:ring-brand-500/20"
                        : txidValid
                          ? "border-emerald-500/40 focus:ring-emerald-500/20"
                          : "border-red-500/50 focus:ring-red-500/20"
                    }`}
                  />
                  {txid.length > 0 && !txidValid && (
                    <p className="text-xs text-red-400">Format attendu : 64 caractères hexadécimaux (0-9, a-f).</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="declared-amount" className="block text-sm font-medium text-zinc-300">
                    Montant envoyé en LTC <span className="text-zinc-500">(optionnel)</span>
                  </label>
                  <input
                    id="declared-amount"
                    value={declaredAmount}
                    onChange={(e) => setDeclaredAmount(e.target.value)}
                    placeholder="ex : 0.12"
                    inputMode="decimal"
                    className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-zinc-500 transition-all duration-200 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white/[0.05]"
                  />
                </div>

                {error && (
                  <p className="flex items-center gap-2 text-sm text-red-400">
                    <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
                  </p>
                )}
                {success && (
                  <p className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> {success}
                  </p>
                )}

                <Button type="submit" disabled={submitting || !txidValid} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting ? "Envoi…" : `Soumettre le paiement ${ui.name}`}
                </Button>
              </form>
            </Card>

            {/* Historique des soumissions */}
            <Card className="space-y-3 p-0">
              <div className="flex items-center justify-between px-6 pt-6">
                <CardTitle className="text-base">Vos commandes</CardTitle>
                {!loadingList && submissions.length > 0 && (
                  <span className="text-xs text-zinc-500">{submissions.length} commande(s)</span>
                )}
              </div>

              {loadingList ? (
                <div className="flex justify-center px-6 pb-6 pt-2">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                </div>
              ) : submissions.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-zinc-500">
                  Aucune commande pour le moment. Soumettez votre TXID après le paiement.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.04] px-6 pb-4">
                  {submissions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={s.plan === "BUSINESS" ? "warning" : "info"}>{s.plan === "BUSINESS" ? "Business" : "Pro"}</Badge>
                          {s.reference && <span className="font-mono text-[11px] text-zinc-500">{s.reference}</span>}
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-zinc-400">{s.txid}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-600">
                          {new Date(s.createdAt).toLocaleString("fr-FR")}
                          {s.amount ? ` · ${s.amount} LTC` : ""}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={s.status} />
                        {s.status === "RECEIVED" && (
                          <span className="text-[11px] text-zinc-500">
                            {s.activationKey ? "Clé émise" : "Clé en préparation"}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {submissions.some((s) => s.status === "RECEIVED") && (
                <div className="border-t border-white/[0.06] px-6 py-4">
                  <Link href="/access/activate">
                    <Button className="w-full" variant="secondary">
                      <KeyRound className="h-4 w-4" /> J&apos;ai ma clé — activer mon plan
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Légende des statuts */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" /> En attente</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Paiement reçu</span>
          <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-brand-400" /> Clé d&apos;activation</span>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Déjà une clé ?{" "}
          <Link href="/access/activate" className="text-brand-400 hover:text-brand-300">Activez votre plan</Link>
          {" · "}
          <Link href="/dashboard/plan" className="text-brand-400 hover:text-brand-300">Comparer les plans</Link>
        </p>
      </div>
    </div>
  );
}
