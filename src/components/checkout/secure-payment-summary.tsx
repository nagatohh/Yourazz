import { Lock } from "lucide-react";

interface SecurePaymentSummaryProps {
  amount: number;
  recipientName: string;
  payerName?: string;
  description?: string;
}

export function SecurePaymentSummary({ amount, recipientName, payerName, description }: SecurePaymentSummaryProps) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.015] px-4 py-2.5">
        <Lock className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Récapitulatif sécurisé
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Montant</span>
          <span className="text-xl font-bold tracking-tight text-white">{(amount / 100).toFixed(2)} €</span>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
          <span className="text-sm text-zinc-500">Bénéficiaire</span>
          <span className="text-sm font-medium text-zinc-200">{recipientName}</span>
        </div>
        {payerName && (
          <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
            <span className="text-sm text-zinc-500">De la part de</span>
            <span className="text-sm text-zinc-300">{payerName}</span>
          </div>
        )}
        {description && (
          <div className="flex items-start justify-between gap-4 border-t border-white/[0.05] pt-3">
            <span className="text-sm text-zinc-500 flex-shrink-0">Motif</span>
            <span className="text-sm text-zinc-300 text-right">{description}</span>
          </div>
        )}
      </div>
    </div>
  );
}
