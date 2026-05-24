"use client";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Une erreur est survenue</h2>
        <p className="mt-2 text-sm text-zinc-400">{error.message || "Erreur inattendue"}</p>
      </div>
      <button
        onClick={reset}
        className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}
