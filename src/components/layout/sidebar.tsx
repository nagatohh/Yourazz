"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
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
  Menu,
  X,
  Activity,
  ShieldAlert,
  Webhook,
  Gem,
  Bitcoin,
  KeyRound,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowUpDown },
  { href: "/dashboard/payouts", label: "Retraits", icon: Banknote },
  { href: "/dashboard/payment-link", label: "Lien de paiement", icon: LinkIcon },
  { href: "/dashboard/bank-account", label: "Compte bancaire", icon: Building2 },
  { href: "/dashboard/plan", label: "Mon plan", icon: Gem },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
  { href: "/dashboard/security", label: "Sécurité", icon: Shield },
];

const adminItems = [
  { href: "/admin", label: "Vue d'ensemble", icon: Users },
  { href: "/admin/payments", label: "Paiements", icon: CreditCard },
  { href: "/admin/crypto-payments", label: "Paiements crypto", icon: Bitcoin },
  { href: "/admin/activation-keys", label: "Clés d'activation", icon: KeyRound },
  { href: "/admin/chargeback-defender", label: "Chargeback Defender", icon: ShieldAlert },
  { href: "/admin/invitations", label: "Invitations", icon: Mail },
  { href: "/admin/security", label: "Sécurité", icon: Shield },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/guardian", label: "Guardian", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setRole(d.user.role); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isAdmin = role === "ADMIN" || role === "ADMIN_OWNER";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {}
    window.location.href = "/api/auth/force-logout";
  };

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-500/10 text-brand-400 shadow-sm"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
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
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-brand-500/10 text-brand-400 shadow-sm"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition-all duration-200 hover:bg-white/[0.04] hover:text-zinc-200"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.04] bg-[#101012]/95 backdrop-blur-xl px-4 lg:hidden">
        <Link href="/dashboard" className="flex items-center">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.04] hover:text-white transition-colors"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-72 flex-col border-r border-white/[0.04] bg-[#101012] transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/[0.04] px-5">
          <Logo size="sm" />
          <button
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:text-white transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col border-r border-white/[0.04] bg-[#101012]">
        <div className="flex h-16 items-center justify-between border-b border-white/[0.04] px-5">
          <Link href="/dashboard" className="flex items-center">
            <Logo size="sm" />
          </Link>
          <NotificationBell />
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
