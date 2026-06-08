"use client";

interface RevenueChartProps {
  data: { name: string; revenue: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 sm:h-64 flex items-center justify-center text-sm text-zinc-500">
        Aucune donnée
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.revenue), 1);
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  return (
    <div className="h-48 sm:h-64 flex flex-col">
      {/* Bars */}
      <div className="flex-1 flex items-end gap-1 sm:gap-2 px-1">
        {data.map((d) => {
          const pct = (d.revenue / max) * 100;
          return (
            <div key={d.name} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="rounded-lg bg-[#0f0f14] border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-white whitespace-nowrap shadow-xl">
                  {fmt(d.revenue)}
                </div>
              </div>
              {/* Bar */}
              <div className="w-full rounded-t-md bg-brand-500/20 relative overflow-hidden" style={{ height: `${Math.max(pct, 2)}%` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-brand-500/60 to-brand-500/20" />
              </div>
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex gap-1 sm:gap-2 px-1 mt-2 border-t border-white/[0.04] pt-2">
        {data.map((d) => (
          <div key={d.name} className="flex-1 text-center text-[10px] sm:text-[11px] text-zinc-500">
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}
