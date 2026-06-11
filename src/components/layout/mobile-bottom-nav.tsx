"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowUpDown, Banknote, LinkIcon, Settings } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowUpDown },
  { href: "/dashboard/payouts", label: "Retraits", icon: Banknote },
  { href: "/dashboard/payment-link", label: "Lien", icon: LinkIcon },
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#101012]/95 backdrop-blur-xl lg:hidden safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] ${
                isActive
                  ? "text-brand-400"
                  : "text-zinc-500 active:text-zinc-300"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
