"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const LABEL: Record<"PRO" | "BUSINESS", string> = { PRO: "Pro", BUSINESS: "Business" };

/** Petit badge « Pro » / « Business » pour marquer une fonctionnalité premium. */
export function PlanBadge({ tier }: { tier: "PRO" | "BUSINESS" }) {
  const amber = tier === "BUSINESS";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        amber ? "bg-amber-500/10 text-amber-400" : "bg-brand-500/10 text-brand-400"
      }`}
    >
      <Lock className="h-2.5 w-2.5" /> {LABEL[tier]}
    </span>
  );
}

/**
 * Verrou visuel : si `unlocked`, affiche le contenu normalement ; sinon,
 * le grise/floute et superpose un appel à l'upgrade (cadenas + « Débloquer »).
 *
 * Le verrouillage visuel n'est PAS une sécurité : l'API serveur bloque de toute
 * façon les actions premium. C'est uniquement de l'UX.
 */
export function PremiumGate({
  unlocked,
  requiredPlan,
  featureLabel,
  children,
}: {
  unlocked: boolean;
  requiredPlan: "PRO" | "BUSINESS";
  featureLabel: string;
  children: React.ReactNode;
}) {
  if (unlocked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[2px]" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#0a0a0a]/60 p-6 text-center backdrop-blur-[1px]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
          <Lock className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white">
            {featureLabel} <PlanBadge tier={requiredPlan} />
          </p>
          <p className="mt-1 text-xs text-zinc-400">Disponible avec le plan {LABEL[requiredPlan]}</p>
        </div>
        <Link href="/dashboard/plan">
          <Button size="sm">Débloquer</Button>
        </Link>
      </div>
    </div>
  );
}
