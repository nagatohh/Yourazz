"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getStripe } from "@/lib/stripe-client";

type Status = "loading" | "success" | "failed";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const paymentIntent = searchParams.get("payment_intent");
    const clientSecret = searchParams.get("payment_intent_client_secret");
    const redirectStatus = searchParams.get("redirect_status");

    // Arrivée sans params Stripe = redirection interne après paiement carte
    if (!paymentIntent || !clientSecret) {
      setStatus("success");
      return;
    }

    // Arrivée depuis une redirection Stripe (Apple Pay, Google Pay, 3DS…)
    if (redirectStatus === "succeeded") {
      setStatus("success");
      return;
    }

    if (redirectStatus === "failed") {
      setErrorMsg("Le paiement a été refusé.");
      setStatus("failed");
      return;
    }

    // Vérification via l'API Stripe pour les statuts ambigus
    getStripe().then(async (stripe) => {
      if (!stripe) { setStatus("success"); return; }
      const { paymentIntent: pi } = await stripe.retrievePaymentIntent(clientSecret);
      if (pi?.status === "succeeded") {
        setStatus("success");
      } else {
        setErrorMsg("Le paiement n'a pas pu être confirmé.");
        setStatus("failed");
      }
    });
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <Card className="relative max-w-md text-center p-8 border-white/[0.06]">
          <div className="mb-6">
            <Logo size="md" />
          </div>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-xl mb-2">Paiement échoué</CardTitle>
          <CardDescription className="leading-relaxed">
            {errorMsg || "Une erreur est survenue lors du paiement."}
          </CardDescription>
          <Link href="/" className="mt-6 inline-block">
            <Button variant="outline">Retour à l&apos;accueil</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[400px] rounded-full bg-[radial-gradient(ellipse_closest-side,rgba(16,185,129,0.07),transparent)]" />
      </div>
      <Card className="relative max-w-md text-center p-8 border-white/[0.06]">
        <div className="mb-6">
          <Logo size="md" />
        </div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <CardTitle className="text-xl mb-2">Paiement confirmé</CardTitle>
        <CardDescription className="leading-relaxed">
          Votre transaction a été traitée avec succès. Un reçu de confirmation vous sera envoyé par email.
        </CardDescription>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
