"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StripeCheckout } from "@/components/checkout/stripe-checkout";

interface LinkData {
  id: string;
  slug: string;
  label: string;
  fixedAmount: number | null;
  userId: string;
  user: { name: string };
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <Card className="max-w-md text-center p-8">
          <CardTitle>Lien introuvable</CardTitle>
          <CardDescription className="mt-2">Ce lien de paiement n&apos;existe pas ou a été désactivé.</CardDescription>
        </Card>
      </div>
    );
  }

  if (!linkData) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/10 via-zinc-950 to-zinc-950" />
      <Card className="relative w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-xl gradient-brand flex items-center justify-center">
            <span className="text-lg font-bold text-white">Y</span>
          </div>
          <CardTitle className="text-xl">{linkData.label}</CardTitle>
          <CardDescription className="mt-1">Payer {linkData.user.name}</CardDescription>
          {linkData.fixedAmount && (
            <p className="mt-3 text-3xl font-bold text-white">{(linkData.fixedAmount / 100).toFixed(2)} €</p>
          )}
        </div>

        {!showCheckout ? (
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
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Montant</span>
                <span className="text-white font-semibold text-lg">{(payAmount / 100).toFixed(2)} €</span>
              </div>
              {payerName && (
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-zinc-400">De</span>
                  <span className="text-zinc-300">{payerName}</span>
                </div>
              )}
            </div>

            <StripeCheckout
              amount={payAmount}
              receiverId={linkData.userId}
              payerEmail={payerEmail}
              payerName={payerName}
              description={description}
              onSuccess={handleSuccess}
              onError={handleError}
            />

            <button
              onClick={() => setShowCheckout(false)}
              className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300 mt-4"
            >
              ← Modifier les informations
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-zinc-500">
          <span>Paiement sécurisé</span>
          <span>•</span>
          <span>PSD2 / SCA</span>
          <span>•</span>
          <span>Chiffré SSL</span>
        </div>
        <p className="mt-2 text-center text-xs text-zinc-600">Propulsé par Yourazz</p>
      </Card>
    </div>
  );
}
