import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { resolveRepoRoot } from "./pathing";

type LogLevel = "info" | "error";

export function logDecision(
  level: LogLevel,
  event: string,
  payload: Record<string, unknown>,
  cwd?: string
): void {
  try {
    const repoRoot = resolveRepoRoot(cwd);
    const logDir = path.join(repoRoot, "tools", "hooks", "logs");
    mkdirSync(logDir, { recursive: true });
    appendFileSync(
      path.join(logDir, "hook-decisions.jsonl"),
      `${JSON.stringify({
        ts: new Date().toISOString(),
        level,
        event,
        ...payload
      })}\n`,
      "utf8"
    );
  } catch {
    // Hooks must degrade silently.
  }
}
