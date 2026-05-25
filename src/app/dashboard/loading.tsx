export default function DashboardLoading() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="h-8 w-48 rounded-lg bg-white/[0.04] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-white/[0.04] animate-pulse" />
    </div>
  );
}
