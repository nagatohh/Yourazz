"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Webhook } from "lucide-react";

interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  eventId: string;
  processed: boolean;
  processedAt: string | null;
  error: string | null;
  attempts: number;
  createdAt: string;
}

export default function AdminWebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(attempt = 0) {
      try {
        const r = await apiFetch("/api/admin/logs?type=webhooks&limit=100");
        if (cancelled) return;

        if (r.status >= 500 && attempt < 2) {
          await new Promise((res) => setTimeout(res, 1500));
          return load(attempt + 1);
        }
        if (!r.ok) {
          const data = await r.json().catch(() => null);
          setError(data?.error || `Erreur ${r.status}`);
          return;
        }
        const d = await r.json();
        if (!cancelled) setEvents(d.events || []);
      } catch {
        if (cancelled) return;
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 1500));
          return load(attempt + 1);
        }
        setError("Erreur reseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <p className="text-red-400 font-medium">{error}</p>
      <button onClick={() => window.location.reload()} className="text-sm text-brand-400 hover:text-brand-300">Reessayer</button>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3">
        <Webhook className="h-6 w-6 text-brand-400" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Webhooks</h1>
          <p className="text-sm text-zinc-500 mt-1">Evenements Stripe recus</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
          <CardTitle className="text-base">Evenements ({events.length})</CardTitle>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Provider</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium">Tentatives</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(ev.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-white font-mono text-xs">{ev.eventType}</td>
                  <td className="px-6 py-4 text-zinc-400">{ev.provider}</td>
                  <td className="px-6 py-4">
                    {ev.processed ? (
                      <Badge variant="success">Traite</Badge>
                    ) : ev.error ? (
                      <Badge variant="error">Erreur</Badge>
                    ) : (
                      <Badge variant="warning">En attente</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{ev.attempts}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Aucun webhook recu</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="divide-y divide-white/[0.04] sm:hidden">
          {events.map((ev) => (
            <div key={ev.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-mono text-white">{ev.eventType}</p>
                {ev.processed ? (
                  <Badge variant="success">OK</Badge>
                ) : (
                  <Badge variant="warning">...</Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">{new Date(ev.createdAt).toLocaleString("fr-FR")}</p>
            </div>
          ))}
          {events.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-500">Aucun webhook</div>
          )}
        </div>
      </Card>
    </div>
  );
}
