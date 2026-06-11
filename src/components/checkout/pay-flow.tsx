"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { PaymentConsentBox, type ConsentData } from "@/components/checkout/payment-consent-box";
import { SecurePaymentSummary } from "@/components/checkout/secure-payment-summary";
import { RefundPolicyNotice } from "@/components/checkout/refund-policy-notice";

const StripeCheckout = dynamic(
  () => import("@/components/checkout/stripe-checkout").then((m) => ({ default: m.StripeCheckout })),
  {
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-xs text-zinc-500">Chargement du paiement sécurisé…</p>
      </div>
    ),
  }
);

export interface PayLinkData {
  id: string;
  slug: string;
  label: string;
  fixedAmount: number | null;
  userId: string;
  recipientName: string;
}

type Step = "info" | "consent" | "checkout";

export function PayFlow({ link }: { link: PayLinkData }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");

  // Préchargement pendant que le payeur remplit le formulaire : le chunk
  // checkout + Stripe.js sont déjà en cache quand il arrive à l'étape carte.
  // requestIdleCallback pour ne pas concurrencer le rendu initial.
  useEffect(() => {
    const preload = () => {
      import("@/components/checkout/stripe-checkout").catch(() => {});
      import("@/lib/stripe-client").then((m) => m.getStripe()).catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(preload, 1500); // Safari iOS : pas de requestIdleCallback
    return () => clearTimeout(t);
  }, []);
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [formError, setFormError] = useState("");

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const finalAmount = link.fixedAmount || Math.round(parseFloat(amount) * 100);
    if (!finalAmount || Number.isNaN(finalAmount) || finalAmount < 100) {
      setFormError("Le montant minimum est de 1,00 €.");
      return;
    }
    if (finalAmount > 10_000_00) {
      setFormError("Le montant maximum par paiement est de 10 000 €.");
      return;
    }
    setPayAmount(finalAmount);
    setStep("consent");
  };

  const handleConsent = (consent: ConsentData) => {
    setConsentData(consent);
    setStep("checkout");
  };

  return (
    <>
      {step === "info" && (
        <form onSubmit={handleContinue} className="space-y-4">
          {!link.fixedAmount && (
            <Input
              id="amount"
              label="Montant (EUR)"
              type="number"
              step="0.01"
              min="1"
              inputMode="decimal"
              placeholder="50.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          )}
          <Input
            id="name"
            label="Votre nom"
            autoComplete="name"
            placeholder="Jean Dupont"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            required
          />
          <Input
            id="email"
            label="Votre email"
            type="email"
            autoComplete="email"
            placeholder="jean@exemple.fr"
            value={payerEmail}
            onChange={(e) => setPayerEmail(e.target.value)}
            required
          />
          <Input
            id="description"
            label="Message (optionnel)"
            placeholder="Merci pour le service…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{formError}</p>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg">
            Continuer vers le paiement
          </Button>
          <RefundPolicyNotice />
        </form>
      )}

      {step === "consent" && (
        <div className="space-y-4">
          <SecurePaymentSummary
            amount={payAmount}
            recipientName={link.recipientName}
            payerName={payerName}
            description={description || undefined}
          />
          <PaymentConsentBox
            amount={payAmount}
            recipientName={link.recipientName}
            description={description || undefined}
            onConsent={handleConsent}
          />
          <button
            onClick={() => setStep("info")}
            className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            &larr; Modifier les informations
          </button>
        </div>
      )}

      {step === "checkout" && (
        <div className="space-y-4">
          <SecurePaymentSummary
            amount={payAmount}
            recipientName={link.recipientName}
            payerName={payerName}
          />

          <StripeCheckout
            amount={payAmount}
            receiverId={link.userId}
            payerEmail={payerEmail}
            payerName={payerName}
            description={description}
            consent={consentData || undefined}
            onSuccess={() => router.push("/payment/success")}
            onError={() => {}}
          />

          <button
            onClick={() => setStep("consent")}
            className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            &larr; Retour
          </button>
        </div>
      )}
    </>
  );
}
