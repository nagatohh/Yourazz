"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Étape 2FA : le mot de passe est validé, on attend le code TOTP
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur de connexion"); return; }
      if (data.requires2fa) {
        setStep("totp");
        return;
      }
      router.push("/dashboard");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Code incorrect");
        if (res.status === 401 && data.error?.includes("expirée")) {
          setStep("credentials");
          setTotpCode("");
        }
        return;
      }
      router.push("/dashboard");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[300px] sm:h-[400px] sm:w-[500px] rounded-full bg-[radial-gradient(ellipse_closest-side,rgba(220,38,38,0.07),transparent)]" />
      </div>
      <Card className="relative w-full max-w-md p-6 sm:p-8 border-white/[0.06]">
        {step === "credentials" ? (
          <>
            <div className="mb-8 text-center">
              <div className="mb-6">
                <Logo size="md" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Connexion</h1>
              <p className="mt-1.5 text-sm text-zinc-500">Accédez à votre espace privé</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="vous@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                id="password"
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Pas de compte ?{" "}
              <Link href="/register" className="text-brand-400 hover:text-brand-300 transition-colors">
                Créer un compte
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <ShieldCheck className="h-6 w-6 text-brand-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Vérification 2FA</h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Entrez le code à 6 chiffres de votre application d&apos;authentification
              </p>
            </div>

            <form onSubmit={handleTotp} className="space-y-4">
              <Input
                id="totp"
                label="Code de vérification"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123 456"
                maxLength={12}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoFocus
                required
                className="text-center text-lg tracking-[0.3em] font-mono"
              />
              <p className="text-[11px] text-zinc-600 text-center">
                Vous pouvez aussi utiliser un code de secours (XXXXX-XXXXX)
              </p>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={loading || totpCode.length < 6}>
                {loading ? "Vérification..." : "Valider"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setTotpCode("");
                  setError("");
                }}
                className="w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                &larr; Retour à la connexion
              </button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
