"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#030308] px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[300px] w-[300px] sm:h-[400px] sm:w-[500px] rounded-full bg-brand-500/[0.05] blur-[120px] sm:blur-[150px]" />
      </div>
      <Card className="relative w-full max-w-md p-6 sm:p-8 border-white/[0.06] text-center">
        <div className="mb-6">
          <Logo size="md" />
        </div>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20">
          <Lock className="h-7 w-7 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Accès exclusif</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">
          L&apos;inscription est réservée aux membres invités.
          Si vous avez reçu un email d&apos;invitation, cliquez sur le lien exclusif qu&apos;il contient.
        </p>
        <Link href="/login">
          <Button variant="outline">Se connecter</Button>
        </Link>
      </Card>
    </div>
  );
}
