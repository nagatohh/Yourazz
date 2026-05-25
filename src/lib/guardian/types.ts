export type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type HealthStatus = "HEALTHY" | "DEGRADED" | "BROKEN";

export interface CheckResult {
  type: string;
  status: HealthStatus;
  severity: Severity;
  message: string;
  details?: Record<string, unknown>;
  issues: IssueFound[];
  durationMs: number;
}

export interface IssueFound {
  type: string;
  severity: Severity;
  title: string;
  description?: string;
  source: string;
  metadata?: Record<string, unknown>;
  autoRepairable: boolean;
}

export interface RepairResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface GuardianReport {
  timestamp: string;
  overallStatus: HealthStatus;
  checks: CheckResult[];
  totalIssues: number;
  criticalIssues: number;
  autoRepairableIssues: number;
  durationMs: number;
}
