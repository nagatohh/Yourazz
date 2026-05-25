"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield } from "lucide-react";

interface SecurityLog {
  id: string;
  action: string;
  severity: string;
  ipAddress: string | null;
  metadata: any;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(attempt = 0) {
      try {
        const r = await apiFetch("/api/admin/logs?type=security&limit=100");
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
        if (!cancelled) setLogs(d.logs || []);
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

  const severityVariant = (s: string) => {
    if (s === "CRITICAL") return "error";
    if (s === "WARNING") return "warning";
    return "default";
  };

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
        <Shield className="h-6 w-6 text-brand-400" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Securite</h1>
          <p className="text-sm text-zinc-500 mt-1">Logs de securite de la plateforme</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
          <CardTitle className="text-base">Evenements recents ({logs.length})</CardTitle>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {logs.map((log) => (
            <div key={log.id} className="px-4 sm:px-6 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{log.action}</p>
                    <Badge variant={severityVariant(log.severity)}>{log.severity}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    {log.user && <span>{log.user.email}</span>}
                    {log.ipAddress && <span>{log.ipAddress}</span>}
                    <span>{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="px-6 py-8 text-center text-zinc-500">Aucun evenement</div>
          )}
        </div>
      </Card>
    </div>
  );
}
