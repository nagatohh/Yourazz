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
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          {change && <p className={`text-xs ${changeColor}`}>{change}</p>}
        </div>
        <div className="rounded-xl bg-brand-500/10 p-2.5">
          <Icon className="h-5 w-5 text-brand-400" />
        </div>
      </div>
    </Card>
  );
}
