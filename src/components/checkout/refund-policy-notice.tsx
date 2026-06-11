import { Info } from "lucide-react";

export function RefundPolicyNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3">
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Ce paiement est <span className="text-zinc-300 font-medium">non remboursable</span> sauf accord
        explicite du bénéficiaire. En payant, vous acceptez la{" "}
        <a href="/cgv" target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2 hover:text-white">
          politique de remboursement
        </a>{" "}
        de Yourazz. Un reçu vous sera envoyé par email après confirmation.
      </p>
    </div>
  );
}
