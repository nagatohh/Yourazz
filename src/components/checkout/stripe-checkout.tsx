"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Lock, Shield } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutProps {
  amount: number;
  receiverId: string;
  payerEmail?: string;
  payerName?: string;
  description?: string;
  onSuccess: (transactionId: string) => void;
  onError: (message: string) => void;
}

export function StripeCheckout(props: CheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idempotencyKey = crypto.randomUUID();
    setLoading(true);

    fetch("/api/payments/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: props.amount,
        receiverId: props.receiverId,
        payerEmail: props.payerEmail,
        payerName: props.payerName,
        description: props.description,
        idempotencyKey,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          props.onError(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setTransactionId(data.transactionId);
        }
      })
      .catch(() => {
        setError("Erreur reseau. Verifiez votre connexion.");
        props.onError("Erreur reseau");
      })
      .finally(() => setLoading(false));
  }, [props.amount, props.receiverId]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-zinc-400 hover:text-white"
        >
          Reessayer
        </button>
      </div>
    );
  }

  if (loading || !clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-xs text-zinc-500">Preparation du paiement securise...</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#e11d48",
            colorBackground: "#0a0a0f",
            colorText: "#ffffff",
            colorDanger: "#ef4444",
            fontFamily: "Inter, system-ui, sans-serif",
            borderRadius: "12px",
            spacingUnit: "4px",
          },
          rules: {
            ".Input": {
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.03)",
            },
            ".Input:focus": {
              border: "1px solid rgba(225,29,72,0.5)",
              boxShadow: "0 0 0 3px rgba(225,29,72,0.1)",
            },
            ".Tab": {
              border: "1px solid rgba(255,255,255,0.06)",
              backgroundColor: "rgba(255,255,255,0.02)",
            },
            ".Tab--selected": {
              border: "1px solid rgba(225,29,72,0.4)",
              backgroundColor: "rgba(225,29,72,0.08)",
            },
          },
        },
        locale: "fr",
      }}
    >
      <CheckoutForm
        amount={props.amount}
        transactionId={transactionId!}
        onSuccess={props.onSuccess}
        onError={props.onError}
      />
    </Elements>
  );
}

interface CheckoutFormProps {
  amount: number;
  transactionId: string;
  onSuccess: (transactionId: string) => void;
  onError: (message: string) => void;
}

function CheckoutForm({ amount, transactionId, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expressAvailable, setExpressAvailable] = useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || loading) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Erreur de validation");
      setLoading(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?tx=${transactionId}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Paiement refuse");
      onError(confirmError.message || "Paiement refuse");
      setLoading(false);
    } else {
      onSuccess(transactionId);
    }
  };

  const handleExpressCheckout = async (event: any) => {
    if (!stripe || !elements) {
      event.complete("fail");
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?tx=${transactionId}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      event.complete("fail");
      setError(confirmError.message || "Paiement refuse");
      onError(confirmError.message || "Paiement refuse");
    } else {
      event.complete("success");
      onSuccess(transactionId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Express Checkout (Apple Pay / Google Pay / Link) */}
      <div className={expressAvailable === false ? "hidden" : ""}>
        <ExpressCheckoutElement
          onConfirm={handleExpressCheckout}
          onReady={({ availablePaymentMethods }) => {
            setExpressAvailable(
              !!(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay)
            );
          }}
          options={{
            layout: { maxColumns: 2, maxRows: 1 },
          }}
        />
      </div>

      {/* Separator */}
      {expressAvailable !== false && (
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.06]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0a0a0f] px-3 text-zinc-500">ou payer par carte</span>
          </div>
        </div>
      )}

      {/* Card Payment */}
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={!stripe || loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Traitement en cours...
          </span>
        ) : (
          `Payer ${(amount / 100).toFixed(2)} €`
        )}
      </Button>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Lock className="h-3 w-3" /> Chiffre SSL
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Shield className="h-3 w-3" /> 3D Secure
        </span>
      </div>
    </form>
  );
}
