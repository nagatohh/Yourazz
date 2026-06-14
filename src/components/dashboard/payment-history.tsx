"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, CreditCard, Bitcoin } from "lucide-react";

interface Payment {
  id: string;
  type: "stripe" | "crypto";
  amount: string;
  status: string;
  plan: string | null;
  reference: string | null;
  date: string;
}

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  succeeded: { label: "Payé", variant: "success" },
  paid: { label: "Payé", variant: "success" },
  RECEIVED: { label: "Confirmé", variant: "success" },
  pending: { label: "En attente", variant: "warning" },
  PENDING: { label: "En attente", variant: "warning" },
  REJECTED: { label: "Rejeté", variant: "error" },
  failed: { label: "Échoué", variant: "error" },
};

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/plans/history")
      .then((r) => r.json())
      .then((d) => { if (d.history) setPayments(d.history); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-white/[0.04] p-2.5"><Receipt className="h-5 w-5 text-zinc-400" /></div>
          <CardTitle className="text-base">Historique de paiement</CardTitle>
        </div>
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-white/[0.04] p-2.5"><Receipt className="h-5 w-5 text-zinc-400" /></div>
          <div>
            <CardTitle className="text-base">Historique de paiement</CardTitle>
            <CardDescription className="text-xs mt-0.5">Aucun paiement enregistré</CardDescription>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-xl bg-white/[0.04] p-2.5"><Receipt className="h-5 w-5 text-zinc-400" /></div>
        <div>
          <CardTitle className="text-base">Historique de paiement</CardTitle>
          <CardDescription className="text-xs mt-0.5">{payments.length} paiement{payments.length > 1 ? "s" : ""}</CardDescription>
        </div>
      </div>
      <div className="space-y-2">
        {payments.map((p) => {
          const s = STATUS_LABEL[p.status] || { label: p.status, variant: "default" as const };
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                {p.type === "stripe" ? (
                  <CreditCard className="h-4 w-4 flex-shrink-0 text-blue-400" />
                ) : (
                  <Bitcoin className="h-4 w-4 flex-shrink-0 text-amber-400" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {p.amount}
                    {p.plan && <span className="ml-1.5 text-xs text-zinc-500">({p.plan})</span>}
                  </p>
                  <p className="text-[11px] text-zinc-600">
                    {new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {p.reference && <span className="ml-1.5">· {p.reference}</span>}
                  </p>
                </div>
              </div>
              <Badge variant={s.variant} className="flex-shrink-0">{s.label}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
