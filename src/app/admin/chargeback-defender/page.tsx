"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  FileWarning,
  Activity,
  Eye,
} from "lucide-react";

interface Stats {
  totalEvidences: number;
  riskLow: number;
  riskMedium: number;
  riskHigh: number;
  riskCritical: number;
  totalDisputes: number;
}

interface Dispute {
  id: string;
  stripeDisputeId: string;
  amount: number;
  currency: string;
  reason: string | null;
  status: string;
  evidenceDueBy: string | null;
  createdAt: string;
  evidence: { payerEmail: string | null; amount: number } | null;
}

interface HighRiskPayment {
  id: string;
  score: number;
  level: string;
  reasons: string[];
  createdAt: string;
  evidence: {
    id: string;
    payerEmail: string | null;
    payerName: string | null;
    amount: number;
    paymentStatus: string;
    stripePaymentIntentId: string | null;
    createdAt: string;
  };
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const riskBadge = (level: string) => {
  switch (level) {
    case "CRITICAL":
      return <Badge variant="error">Critique</Badge>;
    case "HIGH":
      return <Badge variant="warning">Élevé</Badge>;
    case "MEDIUM":
      return <Badge variant="info">Moyen</Badge>;
    default:
      return <Badge variant="success">Faible</Badge>;
  }
};

const disputeStatus = (status: string) => {
  switch (status) {
    case "won":
      return <Badge variant="success">Gagné</Badge>;
    case "lost":
      return <Badge variant="error">Perdu</Badge>;
    case "needs_response":
      return <Badge variant="warning">Action requise</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
};

export default function ChargebackDefenderPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [highRisk, setHighRisk] = useState<HighRiskPayment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [period, setPeriod] = useState("30d");

  const load = (p: string) => {
    setLoading(true);
    apiFetch(`/api/admin/chargeback-defender?period=${p}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setDisputes(data.disputes || []);
        setHighRisk(data.highRiskPayments || []);
        setAlerts(data.alerts || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(period); }, [period]);

  const viewEvidence = (id: string) => {
    apiFetch(`/api/admin/chargeback-defender/evidence/${id}`)
      .then((r) => r.json())
      .then(setSelectedEvidence);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n / 100);

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-400" />
            Chargeback Defender
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Protection anti-litiges et collecte de preuves
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-zinc-300"
        >
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="90d">90 jours</option>
        </select>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-brand-400" />
              <span className="text-xs text-zinc-500">Preuves collectées</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.totalEvidences}</p>
          </Card>
          <Card className={`p-4 ${stats.totalDisputes > 0 ? "border-red-500/20" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <FileWarning className="h-4 w-4 text-red-400" />
              <span className="text-xs text-zinc-500">Litiges</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.totalDisputes}</p>
          </Card>
          <Card className={`p-4 ${stats.riskCritical > 0 ? "border-amber-500/20" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-zinc-500">Risque élevé</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.riskHigh + stats.riskCritical}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-zinc-500">Tendance</span>
            </div>
            <p className="text-xl font-bold text-white">
              {stats.riskCritical > 0 ? "Critique" : stats.riskHigh > 0 ? "Vigilance" : "OK"}
            </p>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="p-4">
          <CardTitle className="text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Alertes récentes
          </CardTitle>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  alert.severity === "CRITICAL"
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">{alert.title}</span>
                  <span className="text-zinc-600">
                    {new Date(alert.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-zinc-400 mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Disputes */}
      <Card className="p-4">
        <CardTitle className="text-sm flex items-center gap-2 mb-3">
          <FileWarning className="h-4 w-4 text-red-400" />
          Litiges Stripe ({disputes.length})
        </CardTitle>
        {disputes.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">Aucun litige sur cette période</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Montant</th>
                  <th className="px-3 py-2 text-left font-medium">Raison</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                  <th className="px-3 py-2 text-left font-medium">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.04]">
                    <td className="px-3 py-2 text-zinc-300">
                      {new Date(d.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-3 py-2 text-white font-medium">{fmt(d.amount)}</td>
                    <td className="px-3 py-2 text-zinc-400">{d.reason || "—"}</td>
                    <td className="px-3 py-2">{disputeStatus(d.status)}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {d.evidenceDueBy
                        ? new Date(d.evidenceDueBy).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* High Risk Payments */}
      <Card className="p-4">
        <CardTitle className="text-sm flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Paiements à risque ({highRisk.length})
        </CardTitle>
        {highRisk.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">Aucun paiement à risque élevé</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Payeur</th>
                  <th className="px-3 py-2 text-left font-medium">Montant</th>
                  <th className="px-3 py-2 text-left font-medium">Score</th>
                  <th className="px-3 py-2 text-left font-medium">Niveau</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                  <th className="px-3 py-2 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {highRisk.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-zinc-300">
                      {new Date(r.evidence.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {r.evidence.payerName || r.evidence.payerEmail || "—"}
                    </td>
                    <td className="px-3 py-2 text-white font-medium">{fmt(r.evidence.amount)}</td>
                    <td className="px-3 py-2 text-zinc-300">{r.score}/100</td>
                    <td className="px-3 py-2">{riskBadge(r.level)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.evidence.paymentStatus === "succeeded" ? "success" : r.evidence.paymentStatus === "failed" ? "error" : "warning"}>
                        {r.evidence.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => viewEvidence(r.evidence.id)}
                        className="text-brand-400 hover:text-brand-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Evidence Detail Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-sm">Dossier de preuves</CardTitle>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="text-zinc-500 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <Section title="Paiement">
                <Row label="Montant" value={fmt(selectedEvidence.payment.amount)} />
                <Row label="Statut" value={selectedEvidence.payment.status} />
                <Row label="Description" value={selectedEvidence.payment.description || "—"} />
                <Row label="Date" value={new Date(selectedEvidence.payment.createdAt).toLocaleString("fr-FR")} />
              </Section>

              <Section title="Payeur">
                <Row label="Email" value={selectedEvidence.payer.email || "—"} />
                <Row label="Nom" value={selectedEvidence.payer.name || "—"} />
                <Row label="IP" value={selectedEvidence.payer.ipAddress || "—"} />
              </Section>

              <Section title="Consentement">
                <Row label="CGU acceptées" value={selectedEvidence.consent.termsAccepted ? "Oui" : "Non"} />
                <Row label="Politique remb." value={selectedEvidence.consent.refundPolicyAccepted ? "Oui" : "Non"} />
                <Row label="Date consentement" value={selectedEvidence.consent.consentAt ? new Date(selectedEvidence.consent.consentAt).toLocaleString("fr-FR") : "—"} />
              </Section>

              <Section title="Stripe">
                <Row label="PaymentIntent" value={selectedEvidence.stripe.paymentIntentId || "—"} />
                <Row label="Charge" value={selectedEvidence.stripe.chargeId || "—"} />
              </Section>

              {selectedEvidence.delivery && (
                <Section title="Livraison">
                  <Row label="Webhook confirmé" value={selectedEvidence.delivery.webhookConfirmed ? "Oui" : "Non"} />
                  <Row label="Date livraison" value={selectedEvidence.delivery.deliveredAt ? new Date(selectedEvidence.delivery.deliveredAt).toLocaleString("fr-FR") : "—"} />
                </Section>
              )}

              {selectedEvidence.risk && (
                <Section title="Risque">
                  <Row label="Score" value={`${selectedEvidence.risk.score}/100`} />
                  <Row label="Niveau" value={selectedEvidence.risk.level} />
                  <Row label="Raisons" value={(selectedEvidence.risk.reasons || []).join(", ")} />
                </Section>
              )}

              {selectedEvidence.dispute && (
                <Section title="Litige">
                  <Row label="ID" value={selectedEvidence.dispute.stripeDisputeId} />
                  <Row label="Raison" value={selectedEvidence.dispute.reason || "—"} />
                  <Row label="Statut" value={selectedEvidence.dispute.status} />
                </Section>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-zinc-400 font-medium mb-2 uppercase tracking-wider text-[10px]">{title}</h3>
      <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-mono text-[11px] max-w-[200px] truncate">{value}</span>
    </div>
  );
}
