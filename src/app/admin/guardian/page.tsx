"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Shield, AlertTriangle, CheckCircle, RefreshCw, Wrench } from "lucide-react";

interface GuardianStatus {
  status: "HEALTHY" | "DEGRADED" | "BROKEN";
  lastCheck: string | null;
  openIssues: number;
  criticalIssues: number;
  recentRepairs: number;
}

interface CheckResult {
  type: string;
  status: string;
  severity: string;
  message: string;
  issues: Array<{
    type: string;
    severity: string;
    title: string;
    autoRepairable: boolean;
  }>;
  durationMs: number;
}

interface GuardianReport {
  timestamp: string;
  overallStatus: string;
  checks: CheckResult[];
  totalIssues: number;
  criticalIssues: number;
  autoRepairableIssues: number;
  durationMs: number;
}

interface RepairResults {
  attempted: number;
  succeeded: number;
  failed: number;
  results: Array<{ issue: string; result: { success: boolean; message: string } }>;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  HEALTHY: "bg-green-500/10 text-green-400 border-green-500/20",
  DEGRADED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  BROKEN: "bg-red-500/10 text-red-400 border-red-500/20",
};

const severityColors: Record<string, string> = {
  INFO: "bg-blue-500/10 text-blue-400",
  WARNING: "bg-yellow-500/10 text-yellow-400",
  ERROR: "bg-orange-500/10 text-orange-400",
  CRITICAL: "bg-red-500/10 text-red-400",
};

export default function GuardianPage() {
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [repairResults, setRepairResults] = useState<RepairResults | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStatus();
    loadLogs();
  }, []);

  async function loadStatus() {
    try {
      const res = await apiFetch("/api/guardian/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      setError("Impossible de charger le statut Guardian");
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    try {
      const res = await apiFetch("/api/guardian/logs?limit=30");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch {}
  }

  async function runChecks() {
    setRunning(true);
    setError("");
    try {
      const res = await apiFetch("/api/guardian/run-checks", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        await loadStatus();
        await loadLogs();
      } else {
        setError("Erreur lors de l'execution des checks");
      }
    } catch {
      setError("Erreur reseau");
    } finally {
      setRunning(false);
    }
  }

  async function runRepairs() {
    setRepairing(true);
    setError("");
    try {
      const res = await apiFetch("/api/guardian/repair", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRepairResults(data);
        await loadStatus();
        await loadLogs();
      } else if (res.status === 403) {
        setError("Reserves au owner uniquement");
      } else {
        setError("Erreur lors de la reparation");
      }
    } catch {
      setError("Erreur reseau");
    } finally {
      setRepairing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Activity className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Guardian AI
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitoring, diagnostics et reparation automatique
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runChecks}
            disabled={running}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
            {running ? "Analyse..." : "Lancer les checks"}
          </Button>
          <Button
            onClick={runRepairs}
            disabled={repairing || !status || status.openIssues === 0}
                        className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Wrench className={`w-4 h-4 mr-2 ${repairing ? "animate-spin" : ""}`} />
            {repairing ? "Reparation..." : "Auto-repair"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Status Overview */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-[#0a0a1a] border-gray-800 p-4">
            <div className="text-xs text-gray-400 mb-1">Statut global</div>
            <Badge className={statusColors[status.status] || ""}>
              {status.status}
            </Badge>
          </Card>
          <Card className="bg-[#0a0a1a] border-gray-800 p-4">
            <div className="text-xs text-gray-400 mb-1">Issues ouvertes</div>
            <div className="text-xl font-bold text-white">{status.openIssues}</div>
          </Card>
          <Card className="bg-[#0a0a1a] border-gray-800 p-4">
            <div className="text-xs text-gray-400 mb-1">Critiques</div>
            <div className={`text-xl font-bold ${status.criticalIssues > 0 ? "text-red-400" : "text-green-400"}`}>
              {status.criticalIssues}
            </div>
          </Card>
          <Card className="bg-[#0a0a1a] border-gray-800 p-4">
            <div className="text-xs text-gray-400 mb-1">Reparations (24h)</div>
            <div className="text-xl font-bold text-purple-400">{status.recentRepairs}</div>
          </Card>
        </div>
      )}

      {/* Check Results */}
      {report && (
        <Card className="bg-[#0a0a1a] border-gray-800 p-6">
          <CardTitle className="text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Resultats — {report.overallStatus}
            <span className="text-xs text-gray-500 ml-auto">{report.durationMs}ms</span>
          </CardTitle>
          <div className="space-y-3">
            {report.checks.map((check) => (
              <div key={check.type} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {check.status === "HEALTHY" ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-sm font-medium text-white">{check.type}</span>
                    <Badge className={severityColors[check.severity] || ""}>
                      {check.severity}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">{check.durationMs}ms</span>
                </div>
                <p className="text-xs text-gray-400">{check.message}</p>
                {check.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {check.issues.map((issue, i) => (
                      <div key={i} className="text-xs flex items-center gap-2 text-gray-300">
                        <Badge className={severityColors[issue.severity] || ""}>
                          {issue.severity}
                        </Badge>
                        <span>{issue.title}</span>
                        {issue.autoRepairable && (
                          <Badge className="bg-purple-500/10 text-purple-300">
                            auto-repair
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Repair Results */}
      {repairResults && (
        <Card className="bg-[#0a0a1a] border-gray-800 p-6">
          <CardTitle className="text-white mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-400" />
            Reparations
          </CardTitle>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{repairResults.attempted}</div>
              <div className="text-xs text-gray-400">Tentees</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{repairResults.succeeded}</div>
              <div className="text-xs text-gray-400">Reussies</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{repairResults.failed}</div>
              <div className="text-xs text-gray-400">Echouees</div>
            </div>
          </div>
          <div className="space-y-2">
            {repairResults.results.map((r, i) => (
              <div key={i} className="text-xs flex items-center gap-2 border border-gray-800 rounded p-2">
                {r.result.success ? (
                  <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                )}
                <span className="text-gray-300">{r.issue}</span>
                <span className="text-gray-500 ml-auto">{r.result.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card className="bg-[#0a0a1a] border-gray-800 p-6">
          <CardTitle className="text-white mb-4">Logs Guardian</CardTitle>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="text-xs flex items-center gap-2 py-1 border-b border-gray-800/50">
                <Badge className={severityColors[log.level] || "bg-gray-500/10 text-gray-400"}>
                  {log.level}
                </Badge>
                <span className="text-gray-300 flex-1">{log.message}</span>
                <span className="text-gray-600 shrink-0">
                  {new Date(log.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
