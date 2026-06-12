"use client";

import { useState, useRef } from "react";
import { Shield } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PaymentConsentBoxProps {
  amount: number;
  currency?: string;
  recipientName: string;
  description?: string;
  onConsent: (consent: ConsentData) => void;
}

export interface ConsentData {
  termsAccepted: boolean;
  refundPolicyAccepted: boolean;
  consentAt: string;
  consentDurationMs: number;
}

export function PaymentConsentBox({ amount, currency = "eur", recipientName, description, onConsent }: PaymentConsentBoxProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false);
  const mountedAt = useRef(Date.now());

  const isValid = termsAccepted && refundPolicyAccepted;

  const handleConfirm = () => {
    if (!isValid) return;
    onConsent({
      termsAccepted: true,
      refundPolicyAccepted: true,
      consentAt: new Date().toISOString(),
      consentDurationMs: Date.now() - mountedAt.current,
    });
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        <Shield className="h-4 w-4 text-brand-400" />
        <span className="font-medium">Conditions de paiement</span>
      </div>

      <div className="space-y-3 text-xs text-zinc-400">
        <p>
          Vous vous apprêtez à payer <span className="text-white font-medium">{formatCurrency(amount, currency.toUpperCase())}</span> à{" "}
          <span className="text-white font-medium">{recipientName}</span>
          {description && <> pour : <span className="text-zinc-300">{description}</span></>}.
        </p>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/30"
          />
          <span className="group-hover:text-zinc-300 transition-colors">
            J&apos;accepte les{" "}
            <a href="/legal/terms" target="_blank" className="text-brand-400 hover:underline">
              conditions générales d&apos;utilisation
            </a>{" "}
            de Yourazz.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={refundPolicyAccepted}
            onChange={(e) => setRefundPolicyAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/30"
          />
          <span className="group-hover:text-zinc-300 transition-colors">
            Je comprends que ce paiement est{" "}
            <span className="text-zinc-200 font-medium">non remboursable</span> sauf accord du bénéficiaire, conformément à la{" "}
            <a href="/legal/refund-policy" target="_blank" className="text-brand-400 hover:underline">
              politique de remboursement
            </a>.
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!isValid}
        className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirmer et payer
      </button>
    </div>
  );
}
