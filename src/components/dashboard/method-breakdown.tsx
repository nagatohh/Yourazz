"use client";

interface MethodBreakdownProps {
  data: { method: string; count: number; amount: number }[];
}

const METHOD_LABELS: Record<string, string> = {
  CARD: "Carte bancaire",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  REVOLUT_PAY: "Revolut Pay",
  PAYPAL: "PayPal",
  BANK_TRANSFER: "Virement",
  SEPA: "SEPA",
  OPEN_BANKING: "Open Banking",
};

export default function MethodBreakdown({ data }: MethodBreakdownProps) {
  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
        Aucune donnée
      </div>
    );
  }

  const total = data.reduce((a, d) => a + d.amount, 0) || 1;
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  return (
    <div className="space-y-4">
      {data.map((d) => {
        const pct = Math.round((d.amount / total) * 100);
        return (
          <div key={d.method}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-300 font-medium truncate">
                {METHOD_LABELS[d.method] || "Autre"}
                <span className="ml-2 text-zinc-600">
                  {d.count} paiement{d.count > 1 ? "s" : ""}
                </span>
              </span>
              <span className="flex-shrink-0 text-zinc-400">
                {fmt(d.amount)} <span className="text-zinc-600">· {pct}%</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500/40 to-brand-500/80"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
