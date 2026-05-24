import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-white/[0.05] text-zinc-400 border-white/[0.08]",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}
