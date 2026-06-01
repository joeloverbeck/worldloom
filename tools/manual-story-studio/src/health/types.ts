export type HealthStatus = "ok" | "degraded" | "blocked";

export type HealthSeverity = "info" | "warn" | "error" | "blocking";

export interface HealthFinding {
  severity: HealthSeverity;
  code: string;
  path: string;
  message: string;
  repair_hint: string;
}

export type BlockedAction =
  | "prompt_copy"
  | "prompt_save"
  | "segment_save"
  | "manuscript_compile";

export interface HealthReport {
  status: HealthStatus;
  findings: HealthFinding[];
  blocked_actions: BlockedAction[];
}

export function deriveHealthStatus(
  findings: ReadonlyArray<HealthFinding>,
): HealthStatus {
  if (findings.some((finding) => finding.severity === "blocking")) {
    return "blocked";
  }

  if (findings.some((finding) => finding.severity === "error")) {
    return "degraded";
  }

  return "ok";
}
