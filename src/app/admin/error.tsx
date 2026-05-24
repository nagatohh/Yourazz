"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Erreur administration</h2>
        <p className="mt-2 text-sm text-zinc-400">{error.message || "Une erreur est survenue"}</p>
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
