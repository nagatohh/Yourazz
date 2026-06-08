"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Shield, CreditCard, CheckCircle, Calendar } from "lucide-react";
import { PaymentConsentBox, type ConsentData } from "@/components/checkout/payment-consent-box";

const StripeCheckout = dynamic(
  () => import("@/components/checkout/stripe-checkout").then((m) => ({ default: m.StripeCheckout })),
  { loading: () => <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div> }
);

interface LinkData {
  id: string;
  slug: string;
  label: string;
  fixedAmount: number | null;
  userId: string;
  user: {
    name: string;
    username: string | null;
    memberSince: string;
    completedPayments: number;
  };
}

export default function PublicPayPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  useEffect(() => {
    fetch(`/api/pay/${slug}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setLinkData(d.link); });
  }, [slug]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = linkData?.fixedAmount || Math.round(parseFloat(amount) * 100);
    if (!finalAmount || finalAmount < 100) return;
    setPayAmount(finalAmount);
    setShowConsent(true);
  };

  const handleConsent = (consent: ConsentData) => {
    setConsentData(consent);
    setShowConsent(false);
    setShowCheckout(true);
  };

  const handleSuccess = () => {
    router.push("/payment/success");
  };

  const handleError = (msg: string) => {
    console.error("Payment error:", msg);
  };

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030308] px-4">
        <Card className="max-w-md text-center p-8 border-white/[0.08]">
          <CardTitle>Lien introuvable</CardTitle>
          <CardDescription className="mt-2">Ce lien de paiement n&apos;existe pas ou a été désactivé.</CardDescription>
        </Card>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030308]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const memberDate = new Date(linkData.user.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const initials = (linkData.user.name || "Y").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#030308] px-4 py-6 sm:py-8 noise">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-brand-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Profile Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="mx-auto mb-3 sm:mb-4 h-16 w-16 sm:h-20 sm:w-20 rounded-full gradient-brand flex items-center justify-center shadow-xl shadow-brand-500/20 ring-4 ring-white/[0.05]">
            <span className="text-xl sm:text-2xl font-bold text-white">{initials}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{linkData.user.name}</h1>
          {linkData.user.username && (
            <p className="text-sm text-zinc-500 mt-0.5">@{linkData.user.username}</p>
          )}

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {linkData.user.completedPayments > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>{linkData.user.completedPayments} paiement{linkData.user.completedPayments > 1 ? "s" : ""} reçu{linkData.user.completedPayments > 1 ? "s" : ""}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              <span>Membre depuis {memberDate}</span>
            </div>
          </div>
        </div>

        {/* Payment Card */}
        <Card className="p-5 sm:p-8 border-white/[0.08]">
          <div className="text-center mb-6">
            <p className="text-sm text-zinc-400">{linkData.label}</p>
            {linkData.fixedAmount && (
              <p className="mt-3 text-4xl font-bold text-white tracking-tight">
                {(linkData.fixedAmount / 100).toFixed(2)} <span className="text-lg text-zinc-500">EUR</span>
              </p>
            )}
          </div>

          {!showConsent && !showCheckout ? (
            <form onSubmit={handleContinue} className="space-y-4">
              {!linkData.fixedAmount && (
                <Input
                  id="amount"
                  label="Montant (EUR)"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="50.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              )}
              <Input
                id="name"
                label="Votre nom"
                placeholder="Jean Dupont"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
              />
              <Input
                id="email"
                label="Votre email"
                type="email"
                placeholder="jean@exemple.fr"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                required
              />
              <Input
                id="description"
                label="Message (optionnel)"
                placeholder="Merci pour le service..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button type="submit" className="w-full" size="lg">
                Continuer vers le paiement
              </Button>
            </form>
          ) : showConsent && !showCheckout ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Montant</span>
                  <span className="text-white font-bold text-xl tracking-tight">{(payAmount / 100).toFixed(2)} €</span>
                </div>
              </div>
              <PaymentConsentBox
                amount={payAmount}
                recipientName={linkData.user.name}
                description={description || undefined}
                onConsent={handleConsent}
              />
              <button
                onClick={() => setShowConsent(false)}
                className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors mt-2"
              >
                &larr; Modifier les informations
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Montant</span>
                  <span className="text-white font-bold text-xl tracking-tight">{(payAmount / 100).toFixed(2)} €</span>
                </div>
                {payerName && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="text-sm text-zinc-500">De</span>
                    <span className="text-sm text-zinc-300">{payerName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.06]">
                  <span className="text-sm text-zinc-500">À</span>
                  <span className="text-sm text-zinc-300">{linkData.user.name}</span>
                </div>
              </div>

              <StripeCheckout
                amount={payAmount}
                receiverId={linkData.userId}
                payerEmail={payerEmail}
                payerName={payerName}
                description={description}
                consent={consentData || undefined}
                onSuccess={handleSuccess}
                onError={handleError}
              />

              <button
                onClick={() => setShowCheckout(false)}
                className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors mt-4"
              >
                &larr; Modifier les informations
              </button>
            </div>
          )}
        </Card>

        {/* Trust footer */}
        <div className="mt-5 sm:mt-6 text-center">
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] text-zinc-600">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> PSD2</span>
            <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> 3D Secure</span>
          </div>
          <p className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] text-zinc-700">Paiement sécurisé propulsé par <span className="text-zinc-500">Yourazz</span></p>
        </div>
      </div>
    </div>
  );
}
