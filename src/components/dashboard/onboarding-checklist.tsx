"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, Mail, Building2, Share2, Sparkles, X, ArrowRight } from "lucide-react";

interface OnboardingState {
  emailVerified: boolean;
  hasBankAccount: boolean;
  hasReceivedPayment: boolean;
  linkSlug: string | null;
}

const DISMISS_KEY = "yourazz-onboarding-dismissed";

export function OnboardingChecklist() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    apiFetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setState(d); })
      .catch(() => {});
  }, []);

  if (!state || dismissed) return null;

  const steps = [
    {
      done: state.emailVerified,
      icon: Mail,
      title: "Vérifiez votre adresse email",
      desc: "Cliquez sur le lien reçu par email pour activer toutes les fonctionnalités.",
      action: state.emailVerified ? null : (
        <button
          onClick={() => {
            apiFetch("/api/auth/resend-verification", { method: "POST" })
              .then(() => setResent(true))
              .catch(() => {});
          }}
          className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          {resent ? "Email renvoyé ✓" : "Renvoyer l'email"}
        </button>
      ),
    },
    {
      done: state.hasBankAccount,
      icon: Building2,
      title: "Ajoutez votre IBAN",
      desc: "Indispensable pour retirer vos gains vers votre compte bancaire.",
      action: state.hasBankAccount ? null : (
        <Link href="/dashboard/bank-account" className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors">
          Ajouter mon IBAN <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
    {
      done: state.hasReceivedPayment,
      icon: Share2,
      title: "Recevez votre premier paiement",
      desc: "Partagez votre lien de paiement à vos clients par SMS, email ou réseaux sociaux.",
      action: state.hasReceivedPayment ? null : (
        <Link href="/dashboard/payment-link" className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors">
          Partager mon lien <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="relative overflow-hidden border-brand-500/15 bg-gradient-to-br from-brand-500/[0.04] to-transparent p-5 sm:p-6">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
        aria-label="Masquer le guide"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-brand-500/10 p-2.5">
          <Sparkles className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Bien démarrer sur Yourazz</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {doneCount}/{steps.length} étapes complétées
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full gradient-brand transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
              step.done
                ? "border-emerald-500/10 bg-emerald-500/[0.03]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            {step.done ? (
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-zinc-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${step.done ? "text-zinc-500 line-through" : "text-white"}`}>
                {step.title}
              </p>
              {!step.done && <p className="mt-0.5 text-xs text-zinc-500">{step.desc}</p>}
              {step.action && <div className="mt-2">{step.action}</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
