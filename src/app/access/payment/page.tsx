"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lock, Zap, Shield, Loader2 } from "lucide-react";

const FEATURES = [
  "Liens de paiement illimités",
  "Encaissement carte, Apple Pay, Google Pay",
  "Profil public personnalisé",
  "Retraits vers votre compte bancaire",
  "Protection Chargeback Defender",
  "Notifications de paiement en temps réel",
];

export default function AccessPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/access/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.accessStatus === "ACTIVE") router.replace("/dashboard");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const startCheckout = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/access/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création du paiement");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.07),transparent_65%)]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-xl shadow-brand-500/20">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Activez votre accès</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Votre invitation est validée. Dernière étape : votre abonnement Yourazz Access.
          </p>
        </div>

        <Card className="border-brand-500/15 p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-white">29€</span>
              <span className="text-sm text-zinc-500">/mois</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">Sans engagement — annulable à tout moment</p>
          </div>

          <ul className="mb-6 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-brand-400" />
                {f}
              </li>
            ))}
          </ul>

          {error && <p className="mb-4 text-sm text-red-400 text-center">{error}</p>}

          <Button className="w-full" size="lg" onClick={startCheckout} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…
              </>
            ) : (
              "Activer mon accès"
            )}
          </Button>

          <p className="mt-4 text-center text-[11px] text-zinc-600">
            L&apos;accès est activé automatiquement dès confirmation du paiement par Stripe.
          </p>
        </Card>

        <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-zinc-600 sm:gap-6 sm:text-[11px]">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" /> Chiffré SSL
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" /> 3D Secure
          </span>
          <span className="flex items-center gap-1">Paiement sécurisé Stripe</span>
        </div>
      </div>
    </div>
  );
}
