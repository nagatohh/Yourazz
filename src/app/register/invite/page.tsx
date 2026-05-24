"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

function InviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-with-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/verify-email?pending=true");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030308] px-4">
        <Card className="max-w-md text-center p-8 border-white/[0.06]">
          <h1 className="text-xl font-bold text-white">Lien invalide</h1>
          <p className="mt-2 text-sm text-zinc-500">Ce lien d&apos;invitation est invalide ou manquant.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030308] px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[500px] rounded-full bg-brand-500/[0.05] blur-[150px]" />
      </div>
      <Card className="relative w-full max-w-md p-8 border-white/[0.06]">
        <div className="mb-8 text-center">
          <div className="mb-5">
            <Logo size="md" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Créer votre compte</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Vous avez été invité à rejoindre YouRazz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="name" label="Nom complet" placeholder="Jean Dupont" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="email" label="Email (identique à l'invitation)" type="email" placeholder="vous@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input id="password" label="Mot de passe" type="password" placeholder="Min. 8 caractères" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Création..." : "Créer mon compte"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#030308]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>}>
      <InviteForm />
    </Suspense>
  );
}
