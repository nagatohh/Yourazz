"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Mail } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const pending = searchParams.get("pending");
  const [status, setStatus] = useState<"pending" | "verifying" | "success" | "error">(
    pending ? "pending" : token ? "verifying" : "pending"
  );
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStatus("success");
        else { setStatus("error"); setError(d.error || "Erreur"); }
      })
      .catch(() => { setStatus("error"); setError("Erreur réseau"); });
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = await res.json();
    setResending(false);
    if (data.success) setResent(true);
    else setError(data.error || "Erreur");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060a] px-4 noise">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[400px] rounded-full bg-brand-500/[0.05] blur-[100px]" />
      </div>
      <Card className="relative max-w-md w-full text-center p-8 border-white/[0.08]">
        {status === "pending" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
              <Mail className="h-8 w-8 text-brand-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Vérifiez votre email</h1>
            <p className="text-sm text-zinc-500 leading-relaxed mb-6">
              Un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien pour activer votre compte.
            </p>
            {resent ? (
              <p className="text-sm text-emerald-400">Email renvoyé avec succès</p>
            ) : (
              <Button variant="outline" onClick={handleResend} disabled={resending}>
                {resending ? "Envoi..." : "Renvoyer l'email"}
              </Button>
            )}
          </>
        )}

        {status === "verifying" && (
          <div className="py-8">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="mt-4 text-sm text-zinc-500">Vérification en cours...</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Email confirmé</h1>
            <p className="text-sm text-zinc-500 mb-6">Votre compte est maintenant actif.</p>
            <Link href="/dashboard">
              <Button>Accéder au tableau de bord</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Erreur de vérification</h1>
            <p className="text-sm text-zinc-500 mb-6">{error}</p>
            <Button variant="outline" onClick={handleResend} disabled={resending}>
              {resending ? "Envoi..." : "Renvoyer un lien"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#06060a]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
