import { db } from "@/lib/db";

type LogLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL" | "REPAIR";

export async function guardianLog(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  try {
    await db.guardianLog.create({
      data: { level, source: "guardian", message, metadata: (metadata as object) ?? undefined },
    });
  } catch (e) {
    console.error("[GUARDIAN_LOG_FAILED]", { level, message, error: (e as Error).message });
  }
}
