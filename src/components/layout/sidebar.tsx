"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowUpDown,
  Banknote,
  LinkIcon,
  Building2,
  Settings,
  Shield,
  LogOut,
  Users,
  CreditCard,
  Mail,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowUpDown },
  { href: "/dashboard/payouts", label: "Retraits", icon: Banknote },
  { href: "/dashboard/payment-link", label: "Lien de paiement", icon: LinkIcon },
  { href: "/dashboard/bank-account", label: "Compte bancaire", icon: Building2 },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
  { href: "/dashboard/security", label: "Sécurité", icon: Shield },
];

const adminItems = [
  { href: "/admin", label: "Vue d'ensemble", icon: Users },
  { href: "/admin/invitations", label: "Invitations", icon: Mail },
  { href: "/admin/payments", label: "Paiements", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setRole(d.user.role); });
  }, []);

  const isAdmin = role === "ADMIN" || role === "ADMIN_OWNER";

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0f]">
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6">
        <div className="h-8 w-8 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/20">
          <span className="text-sm font-bold text-white">Y</span>
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">Yourazz</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-500/10 text-brand-400 shadow-sm"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Administration</p>
            <div className="space-y-0.5">
              {adminItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-brand-500/10 text-brand-400 shadow-sm"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition-all duration-200 hover:bg-white/[0.04] hover:text-zinc-200"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
