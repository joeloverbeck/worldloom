// Per-template most-recent-segment scan over a trailing window of segment
// sidecars. Consumed by filter.ts (ticket 005) at stage 8 to set the
// recent-use advisory flag. Reads but never writes.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

export interface ComputeRecentUseInput {
  manualStoryRoot: string;
  segmentOrder: string[];
  recentWindow: number;
}

export interface RecentUseResult {
  // Map from mtemplate-N id to the most-recent segment id (e.g., SEG-7)
  // that selected the template within the scanned window. The segment id
  // string is used directly so downstream consumers can show
  // "recently used at SEG-N" without a second lookup.
  recentTemplates: Map<string, string>;
  windowSize: number;
}

export function computeRecentUseMap(
  input: ComputeRecentUseInput,
): RecentUseResult {
  const { manualStoryRoot, segmentOrder, recentWindow } = input;
  if (recentWindow <= 0) {
    return { recentTemplates: new Map(), windowSize: 0 };
  }

  const start = Math.max(0, segmentOrder.length - recentWindow);
  const window = segmentOrder.slice(start);
  const recent = new Map<string, string>();

  // Iterate in order so the highest-index occurrence wins on collision.
  for (const segmentId of window) {
    const sidecarPath = path.join(
      manualStoryRoot,
      "segments",
      `${segmentId}.yaml`,
    );
    if (!existsSync(sidecarPath)) continue;
    let parsed: unknown;
    try {
      parsed = YAML.parse(readFileSync(sidecarPath, "utf8"));
    } catch {
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;
    const sidecar = parsed as Record<string, unknown>;
    const templateId = sidecar.selected_template;
    if (typeof templateId !== "string" || templateId.length === 0) continue;
    recent.set(templateId, segmentId);
  }

  return { recentTemplates: recent, windowSize: recentWindow };
}
