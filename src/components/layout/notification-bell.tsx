"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch";
import { Bell, Banknote, ShieldAlert, TrendingUp, CreditCard, Inbox } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, { icon: typeof Bell; className: string }> = {
  PAYMENT_RECEIVED: { icon: CreditCard, className: "bg-emerald-500/10 text-emerald-400" },
  PAYOUT_CONFIRMED: { icon: Banknote, className: "bg-emerald-500/10 text-emerald-400" },
  PAYOUT_FAILED: { icon: Banknote, className: "bg-red-500/10 text-red-400" },
  RISK_DETECTED: { icon: ShieldAlert, className: "bg-amber-500/10 text-amber-400" },
  PLAN_LIMIT_WARNING: { icon: TrendingUp, className: "bg-amber-500/10 text-amber-400" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiFetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setNotifications(d.notifications || []);
          setUnreadCount(d.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Polling 30s : suffisant pour du "temps réel" perçu sans websocket
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      apiFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then(() => setUnreadCount(0))
        .catch(() => {});
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.04] hover:text-white transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416] shadow-2xl shadow-black/50">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox className="h-6 w-6 text-zinc-600" />
                <p className="text-xs text-zinc-500">Aucune notification</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_ICONS[n.type] || { icon: Bell, className: "bg-white/[0.04] text-zinc-400" };
                const Icon = meta.icon;
                const content = (
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                    <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.className}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] leading-snug ${n.read ? "text-zinc-400" : "font-medium text-white"}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-zinc-600">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />}
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
