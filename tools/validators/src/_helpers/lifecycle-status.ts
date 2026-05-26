export function lifecycleStatus(record: Record<string, unknown>, recordClass: string): string | undefined {
  if (recordClass === "STPLAN") {
    return stringValue(record.plan_status);
  }
  return stringValue(record.status);
}

export function allowedActiveStatuses(recordClass: string): ReadonlySet<string> {
  switch (recordClass) {
    case "CLK":
      return new Set(["active", "paused", "fired"]);
    case "STSEC":
      return new Set(["hidden", "partially_revealed"]);
    case "STQ":
      return new Set(["open", "complicated"]);
    case "STPLAN":
      return new Set(["active", "blocked", "suspended", "revised"]);
    case "STEMO":
      return new Set(["active", "suppressed", "dissociated"]);
    default:
      return new Set();
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
