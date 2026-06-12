"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

// L'activation arrive par webhook Stripe — cette page ne fait qu'attendre
// que accessStatus passe à ACTIVE côté serveur, elle n'active rien elle-même.
export default function AccessSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"waiting" | "active" | "slow">("waiting");
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      while (!cancelled && attempts.current < 30) {
        attempts.current += 1;
        try {
          const res = await apiFetch("/api/access/status");
          const data = await res.json();
          if (data.accessStatus === "ACTIVE") {
            setStatus("active");
            setTimeout(() => router.replace("/dashboard"), 1500);
            return;
          }
        } catch {
          // réseau instable — on continue de poller
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setStatus("slow");
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-4">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.07),transparent_65%)]" />
      </div>

      <Card className="relative w-full max-w-md p-8 text-center border-white/[0.08]">
        {status === "active" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <CardTitle>Accès activé 🎉</CardTitle>
            <CardDescription className="mt-2">
              Bienvenue sur Yourazz. Redirection vers votre tableau de bord…
            </CardDescription>
          </>
        ) : status === "slow" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
            <CardTitle>Activation en cours</CardTitle>
            <CardDescription className="mt-2">
              Votre paiement est confirmé mais l&apos;activation prend plus de temps que prévu.
              Elle se finalisera automatiquement d&apos;ici quelques minutes.
            </CardDescription>
            <Link href="/dashboard" className="mt-5 inline-block">
              <Button variant="outline" size="sm">Aller au tableau de bord</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/20">
              <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
            </div>
            <CardTitle>Confirmation du paiement…</CardTitle>
            <CardDescription className="mt-2">
              Nous attendons la confirmation de Stripe. Cela prend généralement quelques secondes.
            </CardDescription>
          </>
        )}
      </Card>
    </div>
  );
}
