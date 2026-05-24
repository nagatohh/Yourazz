"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Building2, CheckCircle, XCircle } from "lucide-react";

export default function BankAuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>}>
      <BankAuthContent />
    </Suspense>
  );
}

function BankAuthContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session") || "";
  const amount = parseInt(params.get("amount") || "0");
  const bankId = params.get("bank") || "generic";
  const [step, setStep] = useState<"auth" | "code" | "processing" | "done" | "failed">("auth");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const bankNames: Record<string, string> = {
    bnp_paribas: "BNP Paribas",
    societe_generale: "Société Générale",
    credit_agricole: "Crédit Agricole",
    la_banque_postale: "La Banque Postale",
    credit_mutuel: "Crédit Mutuel",
    boursorama: "Boursorama",
    ing: "ING",
    revolut: "Revolut",
    generic: "Votre banque",
  };

  const bankName = bankNames[bankId] || bankNames.generic;

  const handleAuthorize = () => {
    setStep("code");
  };

  const handleConfirmCode = async () => {
    if (code.length < 4) return;
    setLoading(true);
    setStep("processing");

    // Simulate SCA processing delay
    await new Promise((r) => setTimeout(r, 2000));

    try {
      const res = await fetch("/api/payments/open-banking/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (data.status === "succeeded") {
        setStep("done");
        setTimeout(() => router.push("/payment/success"), 1500);
      } else {
        setStep("failed");
        setTimeout(() => router.push("/payment/failed"), 1500);
      }
    } catch {
      setStep("failed");
      setTimeout(() => router.push("/payment/failed"), 1500);
    }
  };

  const handleCancel = () => {
    setStep("failed");
    setTimeout(() => router.push("/payment/failed"), 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md border-slate-200 bg-white p-8 shadow-xl">
        {/* Bank Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-slate-700" />
            <span className="font-semibold text-slate-800">{bankName}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <Shield className="h-3 w-3" />
            <span>Connexion sécurisée</span>
          </div>
        </div>

        {step === "auth" && (
          <div className="space-y-6">
            <div className="text-center">
              <CardTitle className="text-slate-800 text-lg">Autorisation de paiement</CardTitle>
              <CardDescription className="mt-2 text-slate-500">
                Le marchand <strong className="text-slate-700">Yourazz</strong> demande un paiement de :
              </CardDescription>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {(amount / 100).toFixed(2)} €
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
              <p><span className="font-medium">Bénéficiaire :</span> Yourazz SAS</p>
              <p><span className="font-medium">Référence :</span> PAY-{sessionId.slice(-8)}</p>
              <p><span className="font-medium">Authentification :</span> SCA / PSD2</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              >
                Refuser
              </Button>
              <Button
                onClick={handleAuthorize}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Autoriser
              </Button>
            </div>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-6">
            <div className="text-center">
              <CardTitle className="text-slate-800 text-lg">Vérification SCA</CardTitle>
              <CardDescription className="mt-2 text-slate-500">
                Entrez le code de sécurité envoyé par SMS à votre numéro ****42
              </CardDescription>
            </div>

            <div>
              <Input
                id="sca-code"
                placeholder="• • • • • •"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] border-slate-300 bg-white text-slate-800 placeholder:text-slate-300"
                maxLength={6}
              />
              <p className="mt-2 text-center text-xs text-slate-400">
                Code de démonstration : entrez n&apos;importe quel code à 4+ chiffres
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmCode}
                disabled={code.length < 4 || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirmer
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4 text-center py-8">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <CardTitle className="text-slate-800">Traitement en cours</CardTitle>
            <CardDescription className="text-slate-500">
              Communication avec votre banque...
            </CardDescription>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <CardTitle className="text-slate-800">Paiement autorisé</CardTitle>
            <CardDescription className="text-slate-500">
              Redirection vers le marchand...
            </CardDescription>
          </div>
        )}

        {step === "failed" && (
          <div className="space-y-4 text-center py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-slate-800">Paiement refusé</CardTitle>
            <CardDescription className="text-slate-500">
              Redirection...
            </CardDescription>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <p className="text-[10px] text-slate-400">
            Simulation PSD2/SCA — En production, cette page est hébergée par votre banque
          </p>
        </div>
      </Card>
    </div>
  );
}
