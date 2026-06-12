"use client";

import { useState, useEffect, useRef, type MutableRefObject } from "react";
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Lock, Shield } from "lucide-react";
import { getStripe } from "@/lib/stripe-client";

const stripePromise = getStripe();

interface CheckoutProps {
  amount: number;
  currency?: string;
  receiverId: string;
  payerEmail?: string;
  payerName?: string;
  description?: string;
  consent?: {
    termsAccepted: boolean;
    refundPolicyAccepted: boolean;
    consentAt: string;
    consentDurationMs: number;
  };
  onSuccess: (transactionId: string) => void;
  onError: (message: string) => void;
}

export function StripeCheckout(props: CheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // submittedRef : paiement soumis (3DS possible) → ne jamais annuler.
  // completedRef : paiement réussi → ne jamais annuler.
  const submittedRef = useRef(false);
  const completedRef = useRef(false);

  // Si le payeur ferme la page (ou quitte l'étape de paiement) sans avoir payé,
  // on libère l'intent côté serveur : le montant ne reste pas "en attente".
  useEffect(() => {
    if (!transactionId) return;

    const abandon = () => {
      if (submittedRef.current || completedRef.current) return;
      try {
        navigator.sendBeacon("/api/payments/abandon", JSON.stringify({ transactionId }));
      } catch {
        /* navigateur sans sendBeacon — la fenêtre de 30 min côté stats prend le relais */
      }
    };

    window.addEventListener("pagehide", abandon);
    return () => {
      window.removeEventListener("pagehide", abandon);
      // Ne pas appeler abandon() au démontage : le composant se démonte aussi
      // quand le paiement réussit (redirection), ce qui annulerait un paiement valide.
      // Le beacon "pagehide" + le timeout serveur de 30min couvrent les vrais abandons.
    };
  }, [transactionId]);

  useEffect(() => {
    const idempotencyKey = crypto.randomUUID();
    setLoading(true);

    fetch("/api/payments/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: props.amount,
        currency: props.currency || "eur",
        receiverId: props.receiverId,
        payerEmail: props.payerEmail,
        payerName: props.payerName,
        description: props.description,
        idempotencyKey,
        consent: props.consent,
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
            colorPrimary: "#dc2626",
            colorBackground: "#141416",
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
              border: "1px solid rgba(220,38,38,0.5)",
              boxShadow: "0 0 0 3px rgba(220,38,38,0.1)",
            },
            ".Tab": {
              border: "1px solid rgba(255,255,255,0.06)",
              backgroundColor: "rgba(255,255,255,0.02)",
            },
            ".Tab--selected": {
              border: "1px solid rgba(220,38,38,0.4)",
              backgroundColor: "rgba(220,38,38,0.08)",
            },
          },
        },
        locale: "fr",
      }}
    >
      <CheckoutForm
        amount={props.amount}
        currency={props.currency || "eur"}
        transactionId={transactionId!}
        onSuccess={props.onSuccess}
        onError={props.onError}
        submittedRef={submittedRef}
        completedRef={completedRef}
      />
    </Elements>
  );
}

interface CheckoutFormProps {
  amount: number;
  currency: string;
  transactionId: string;
  onSuccess: (transactionId: string) => void;
  onError: (message: string) => void;
  submittedRef: MutableRefObject<boolean>;
  completedRef: MutableRefObject<boolean>;
}

function CheckoutForm({ amount, currency, transactionId, onSuccess, onError, submittedRef, completedRef }: CheckoutFormProps) {
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

    submittedRef.current = true;

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?tx=${transactionId}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      // Paiement refusé → la page reste annulable si le payeur la ferme
      submittedRef.current = false;
      setError(confirmError.message || "Paiement refusé");
      onError(confirmError.message || "Paiement refusé");
      setLoading(false);
    } else {
      completedRef.current = true;
      onSuccess(transactionId);
    }
  };

  const handleExpressCheckout = async (event: any) => {
    if (!stripe || !elements) {
      event.complete("fail");
      return;
    }

    submittedRef.current = true;

    // Apple Pay / Google Pay redirigent toujours vers return_url, le flag
    // redirect:"if_required" est ignoré pour les wallets — on force "always"
    // pour que Stripe gère la redirection proprement.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?tx=${transactionId}`,
      },
      redirect: "always",
    });

    if (confirmError) {
      submittedRef.current = false;
      event.complete("fail");
      setError(confirmError.message || "Paiement refusé");
      onError(confirmError.message || "Paiement refusé");
    } else {
      // Ce bloc n'est atteint que si Stripe n'a pas redirigé (rare)
      completedRef.current = true;
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
              !!(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay || availablePaymentMethods?.link)
            );
          }}
          options={{
            layout: { maxColumns: 2, maxRows: 1 },
            paymentMethods: {
              applePay: "always",
              googlePay: "always",
              link: "auto",
            },
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
            <span className="bg-[#141416] px-3 text-zinc-500">ou payer par carte</span>
          </div>
        </div>
      )}

      {expressAvailable === false && (
        <p className="text-[11px] text-zinc-600 text-center mb-3">
          Apple Pay, Google Pay, Revolut Pay et PayPal disponibles selon votre appareil
        </p>
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
          `Payer ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100)}`
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
