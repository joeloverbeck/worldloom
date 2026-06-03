import { existsSync } from "node:fs";
import path from "node:path";

import type { ReadError } from "../read/result.js";

interface CandidateCause {
  candidates?: unknown;
}

function errorCandidates(error: ReadError): string[] {
  const cause = error.cause as CandidateCause | undefined;
  if (!Array.isArray(cause?.candidates)) return [];
  return cause.candidates.filter((candidate): candidate is string => typeof candidate === "string");
}

export function formatStartupReadError(error: ReadError): string {
  const candidates = errorCandidates(error);
  const candidatesText =
    candidates.length === 0 ? "" : ` Tried candidates: ${candidates.join(", ")}.`;
  return `${error.code}: ${error.repair_hint} Root probe started at: ${error.path}.${candidatesText}`;
}

export function assertRepoRootBootPreflight(repoRoot: string): void {
  const resolvedRoot = path.resolve(repoRoot);
  const worldsPath = path.join(resolvedRoot, "worlds");

  if (!existsSync(worldsPath)) {
    throw new Error(
      [
        "Invalid Manual Story Studio repo root.",
        `Resolved repo root: ${resolvedRoot}`,
        `Missing worlds directory: ${worldsPath}`,
        "Run from the worldloom repo root or pass --repo-root <absolute-path-to-worldloom-repo>.",
      ].join(" "),
    );
  }
}
