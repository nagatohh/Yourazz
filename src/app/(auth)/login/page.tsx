"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.push("/dashboard");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[300px] sm:h-[400px] sm:w-[500px] rounded-full bg-brand-500/[0.05] blur-[120px] sm:blur-[150px]" />
      </div>
      <Card className="relative w-full max-w-md p-6 sm:p-8 border-white/[0.06]">
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
      </Card>
    </div>
  );
}
