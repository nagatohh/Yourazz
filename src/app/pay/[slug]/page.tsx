"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Banknote, Building2, Smartphone } from "lucide-react";

interface LinkData {
  id: string;
  slug: string;
  label: string;
  fixedAmount: number | null;
  userId: string;
  user: { name: string };
}

interface BankOption {
  id: string;
  name: string;
  country: string;
}

type Method = "card" | "apple_pay" | "google_pay" | "open_banking";

export default function PublicPayPage() {
  const { slug } = useParams();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<Method>("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [selectedBank, setSelectedBank] = useState("");

  useEffect(() => {
    fetch(`/api/pay/${slug}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => { if (d) setLinkData(d.link); });

    // Detect Apple Pay — always show in dev/mock mode for testing
    if (typeof window !== "undefined") {
      const hasNativeApplePay = !!(window as any).ApplePaySession?.canMakePayments?.();
      const isDev = window.location.hostname === "localhost";
      setApplePayAvailable(hasNativeApplePay || isDev);
    }
  }, [slug]);

  useEffect(() => {
    if (method === "open_banking" && banks.length === 0) {
      fetch("/api/payments/open-banking/banks?country=FR")
        .then((r) => r.json())
        .then((d) => { setBanks(d.banks || []); if (d.banks?.length) setSelectedBank(d.banks[0].id); });
    }
  }, [method, banks.length]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payAmount = linkData?.fixedAmount || Math.round(parseFloat(amount) * 100);
      if (!payAmount || payAmount < 100) { setError("Montant minimum : 1€"); setLoading(false); return; }

      if (method === "open_banking") {
        const res = await fetch("/api/payments/open-banking/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: linkData!.userId,
            amount: payAmount,
            payerName,
            payerEmail,
            bankId: selectedBank,
            description,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        if (data.authorizationUrl) { window.location.href = data.authorizationUrl; }
        return;
      }

      if (method === "apple_pay") {
        const res = await fetch("/api/payments/apple-pay/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: linkData!.userId,
            amount: payAmount,
            paymentToken: {},
            payerEmail,
            payerName,
            description,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        window.location.href = "/payment/success";
        return;
      }

      // Card / Google Pay payment
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: linkData!.userId,
          amount: payAmount,
          paymentMethod: method,
          payerName,
          payerEmail,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      if (data.redirectUrl) { window.location.href = data.redirectUrl; }
      else { window.location.href = "/payment/success"; }
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
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

        <form onSubmit={handlePay} className="space-y-4">
          {!linkData.fixedAmount && (
            <Input id="amount" label="Montant (EUR)" type="number" step="0.01" min="1" placeholder="50.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          )}
          <Input id="name" label="Votre nom" placeholder="Jean Dupont" value={payerName} onChange={(e) => setPayerName(e.target.value)} required />
          <Input id="email" label="Votre email" type="email" placeholder="jean@exemple.fr" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} required />
          <Input id="description" label="Message (optionnel)" placeholder="Merci pour le service..." value={description} onChange={(e) => setDescription(e.target.value)} />

          {/* Payment Method Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Moyen de paiement</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${method === "card" ? "border-brand-500 bg-brand-600/10 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Carte bancaire</span>
                <span className="text-[10px] text-zinc-500">Visa, Mastercard</span>
              </button>

              {applePayAvailable && (
                <button
                  type="button"
                  onClick={() => setMethod("apple_pay")}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${method === "apple_pay" ? "border-brand-500 bg-brand-600/10 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}
                >
                  <Smartphone className="h-5 w-5" />
                  <span>Apple Pay</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMethod("google_pay")}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${method === "google_pay" ? "border-brand-500 bg-brand-600/10 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}
              >
                <Banknote className="h-5 w-5" />
                <span>Google Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("open_banking")}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${method === "open_banking" ? "border-brand-500 bg-brand-600/10 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}
              >
                <Building2 className="h-5 w-5" />
                <span>Virement bancaire</span>
                <span className="text-[10px] text-zinc-500">Open Banking</span>
              </button>
            </div>
          </div>

          {/* Bank selector for Open Banking */}
          {method === "open_banking" && banks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Votre banque</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-zinc-500">Vous serez redirigé vers votre banque pour autoriser le paiement (SCA)</p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Traitement..." : method === "open_banking" ? "Payer via ma banque" : `Payer${linkData.fixedAmount ? ` ${(linkData.fixedAmount / 100).toFixed(2)} €` : ""}`}
          </Button>
        </form>

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
