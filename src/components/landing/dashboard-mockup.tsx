/**
 * Aperçu du dashboard en pur HTML/CSS — Server Component.
 * Aucune image, aucun JS : net sur tous les écrans et instantané à charger.
 */

const bars = [38, 55, 42, 70, 58, 86, 64, 92, 74, 100, 82, 95];

export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-4xl select-none" aria-hidden="true">
      {/* Halo */}
      <div className="absolute -inset-x-8 -top-8 bottom-0 rounded-[40px] bg-[radial-gradient(ellipse_closest-side,rgba(220,38,38,0.10),transparent)] pointer-events-none" />

      {/* Fenêtre */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#101012] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
        {/* Barre de titre */}
        <div className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.015] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
          <div className="mx-auto flex items-center gap-1.5 rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-1">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span className="text-[10px] text-zinc-500 font-mono">yourazz.xyz/dashboard</span>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar mock — masquée sur mobile */}
          <div className="hidden sm:flex w-40 flex-col gap-1 border-r border-white/[0.05] p-3">
            <span className="mb-2 px-2 text-[11px] font-black tracking-tight text-white">
              You<span className="text-brand-500">razz</span>
            </span>
            {["Tableau de bord", "Transactions", "Retraits", "Lien de paiement"].map((item, i) => (
              <span
                key={item}
                className={`rounded-lg px-2 py-1.5 text-[10px] ${
                  i === 0 ? "bg-brand-500/10 text-brand-400 font-medium" : "text-zinc-600"
                }`}
              >
                {item}
              </span>
            ))}
          </div>

          {/* Contenu */}
          <div className="flex-1 space-y-3 p-3 sm:p-5">
            {/* Cartes de solde */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-brand-500/15 bg-gradient-to-br from-brand-500/[0.08] to-transparent p-2.5 sm:p-3.5">
                <p className="text-[9px] sm:text-[10px] text-zinc-500">Solde disponible</p>
                <p className="mt-0.5 text-sm sm:text-lg font-bold tracking-tight text-white">4 826,50 €</p>
                <p className="mt-0.5 text-[8px] sm:text-[9px] text-emerald-400">+12,4 % cette semaine</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 sm:p-3.5">
                <p className="text-[9px] sm:text-[10px] text-zinc-500">En attente</p>
                <p className="mt-0.5 text-sm sm:text-lg font-bold tracking-tight text-white">312,00 €</p>
                <p className="mt-0.5 text-[8px] sm:text-[9px] text-zinc-600">Clearing 24-48 h</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 sm:p-3.5">
                <p className="text-[9px] sm:text-[10px] text-zinc-500">Reçu ce mois</p>
                <p className="mt-0.5 text-sm sm:text-lg font-bold tracking-tight text-white">18 240 €</p>
                <p className="mt-0.5 text-[8px] sm:text-[9px] text-emerald-400">142 paiements</p>
              </div>
            </div>

            {/* Graphique */}
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] sm:text-[11px] font-medium text-white">Revenus</p>
                <div className="flex gap-1">
                  <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-medium text-brand-400">Semaine</span>
                  <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] text-zinc-600">Mois</span>
                </div>
              </div>
              <div className="flex h-16 sm:h-24 items-end gap-1 sm:gap-1.5">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-brand-600/70 to-brand-500/25"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Transactions */}
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:p-4">
              <p className="mb-2 text-[10px] sm:text-[11px] font-medium text-white">Transactions récentes</p>
              <div className="space-y-1.5">
                {[
                  { name: "Marie L.", method: "Apple Pay", amount: "+150,00 €" },
                  { name: "Thomas D.", method: "Visa •• 4242", amount: "+89,90 €" },
                  { name: "Sophie M.", method: "Google Pay", amount: "+240,00 €" },
                ].map((tx) => (
                  <div key={tx.name} className="flex items-center justify-between rounded-lg px-1 py-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-emerald-500/10">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M7 7l10 10M17 7v10H7" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-medium text-white">{tx.name}</p>
                        <p className="text-[8px] sm:text-[9px] text-zinc-600">{tx.method}</p>
                      </div>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400">{tx.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
