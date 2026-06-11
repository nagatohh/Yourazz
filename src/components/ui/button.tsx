"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  default:
    "bg-gradient-to-b from-brand-500 to-brand-700 text-white hover:from-brand-500 hover:to-brand-600 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
  secondary: "bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.06]",
  outline: "border border-white/[0.08] text-zinc-300 hover:bg-white/[0.04] hover:border-white/[0.12] hover:text-white",
  ghost: "text-zinc-400 hover:bg-white/[0.04] hover:text-white",
  destructive: "bg-red-500/10 text-red-400 hover:bg-red-500/15 border border-red-500/15",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[12px] gap-1.5",
  md: "h-10 px-5 text-[13px] gap-2",
  lg: "h-12 px-7 text-[14px] gap-2.5",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
