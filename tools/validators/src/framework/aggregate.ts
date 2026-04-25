import type { Verdict } from "./types.js";

export interface SeverityAggregate {
  fail_count: number;
  warn_count: number;
  info_count: number;
}

export function aggregateSeverity(verdicts: readonly Verdict[]): SeverityAggregate {
  const aggregate: SeverityAggregate = {
    fail_count: 0,
    warn_count: 0,
    info_count: 0
  };

  for (const verdict of verdicts) {
    if (verdict.severity === "fail") {
      aggregate.fail_count += 1;
    } else if (verdict.severity === "warn") {
      aggregate.warn_count += 1;
    } else {
      aggregate.info_count += 1;
    }
  }

  return aggregate;
}
