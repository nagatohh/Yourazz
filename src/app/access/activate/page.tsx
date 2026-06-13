"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Page d'activation : l'utilisateur saisit la clé fournie par l'admin. Le
// déblocage de l'accès est entièrement géré côté serveur (usage unique).
export default function ActivatePage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = key.trim();
    if (trimmed.length < 8) {
      setError("Saisissez une clé d'activation valide.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/access/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Clé invalide ou déjà utilisée.");
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 1800);
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.07),transparent_65%)]" />
      </div>

      <Card className="relative w-full max-w-md p-8">
        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <CardTitle>Accès débloqué 🎉</CardTitle>
            <CardDescription className="mt-2">
              Votre clé est valide. Redirection vers votre tableau de bord…
            </CardDescription>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <KeyRound className="h-7 w-7 text-brand-400" />
              </div>
              <CardTitle>Activer votre compte</CardTitle>
              <CardDescription className="mt-2">
                Saisissez la clé d&apos;activation qui vous a été fournie après vérification
                de votre paiement.
              </CardDescription>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="key" className="block text-sm font-medium text-zinc-300">
                  Clé d&apos;activation
                </label>
                <input
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="YRZ-XXXXX-XXXXX-XXXXX-XXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="characters"
                  className="flex h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-center font-mono text-sm tracking-wider text-white placeholder:text-zinc-600 transition-all duration-200 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white/[0.05]"
                />
              </div>

              {error && (
                <p className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-3 py-2.5 text-sm text-red-400">
                  <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {loading ? "Vérification…" : "Activer mon accès"}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-zinc-600">
              Pas encore payé ?{" "}
              <Link href="/access/crypto" className="text-brand-400 hover:text-brand-300">
                Régler l&apos;accès en Litecoin
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
