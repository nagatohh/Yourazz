"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060a] px-4 noise">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[500px] rounded-full bg-brand-500/[0.06] blur-[120px]" />
      </div>
      <Card className="relative w-full max-w-md p-8 border-white/[0.08] text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
          <Lock className="h-8 w-8 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Inscription sur invitation</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">
          L&apos;inscription est réservée aux personnes invitées par un administrateur.
          Si vous avez reçu un email d&apos;invitation, cliquez sur le lien qu&apos;il contient.
        </p>
        <Link href="/login">
          <Button variant="outline">Se connecter</Button>
        </Link>
      </Card>
    </div>
  );
}
