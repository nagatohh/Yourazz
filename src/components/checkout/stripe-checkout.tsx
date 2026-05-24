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

  useEffect(() => {
    const idempotencyKey = crypto.randomUUID();

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
        setError("Erreur réseau");
        props.onError("Erreur réseau");
      });
  }, [props.amount, props.receiverId]);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

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
      setError(confirmError.message || "Paiement refusé");
      onError(confirmError.message || "Paiement refusé");
      setLoading(false);
    } else {
      onSuccess(transactionId);
    }
  };

  const handleExpressCheckout = async (event: any) => {
    if (!stripe || !elements) return;

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?tx=${transactionId}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      event.complete("fail");
      setError(confirmError.message || "Paiement refusé");
      onError(confirmError.message || "Paiement refusé");
    } else {
      event.complete("success");
      onSuccess(transactionId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ExpressCheckoutElement
        onConfirm={handleExpressCheckout}
        options={{
          buttonType: { applePay: "plain", googlePay: "pay" },
        }}
      />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-zinc-900 px-2 text-zinc-500">ou payer par carte</span>
        </div>
      </div>

      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={!stripe || loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Traitement...
          </span>
        ) : (
          `Payer ${(amount / 100).toFixed(2)} €`
        )}
      </Button>
    </form>
  );
}
