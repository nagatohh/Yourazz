import { Card } from "./card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  const changeColor = changeType === "positive" ? "text-emerald-400" : changeType === "negative" ? "text-red-400" : "text-zinc-500";

  return (
    <Card className="relative overflow-hidden p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-xs sm:text-sm text-zinc-500 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">{value}</p>
          {change && <p className={`text-xs ${changeColor}`}>{change}</p>}
        </div>
        <div className="rounded-xl bg-brand-500/10 p-2 sm:p-2.5 flex-shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400" />
        </div>
      </div>
    </Card>
  );
}
