import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type { SegmentSidecar } from "../schema/manual-story.js";

const SEGMENT_ID_PATTERN = /^SEG-(\d+)$/;

export interface ListSegmentsOptions {
  manualStoryRoot: string;
}

export interface SegmentListEntry {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  word_count: number;
}

export interface ReadSegmentOptions {
  manualStoryRoot: string;
  segmentId: string;
}

export function listSegments(options: ListSegmentsOptions): SegmentListEntry[] {
  const segmentsDir = path.join(options.manualStoryRoot, "segments");
  if (!existsSync(segmentsDir)) return [];

  const entries: SegmentListEntry[] = [];
  for (const entry of readdirSync(segmentsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = /^SEG-\d+\.yaml$/.exec(entry.name);
    if (!match) continue;

    const sidecarPath = path.join(segmentsDir, entry.name);
    const sidecar = parseSegmentSidecar(sidecarPath);
    if (!sidecar) continue;
    entries.push({
      id: sidecar.id,
      title: sidecar.title,
      created_at: sidecar.created_at,
      updated_at: sidecar.updated_at,
      word_count: sidecar.word_count,
    });
  }

  entries.sort((a, b) => numericSegmentSuffix(a.id) - numericSegmentSuffix(b.id));
  return entries;
}

export function readSegmentSidecar(
  options: ReadSegmentOptions,
): SegmentSidecar | null {
  if (!isSegmentId(options.segmentId)) return null;
  const sidecarPath = path.join(
    options.manualStoryRoot,
    "segments",
    `${options.segmentId}.yaml`,
  );
  if (!existsSync(sidecarPath)) return null;
  return parseSegmentSidecar(sidecarPath);
}

export function readSegmentBody(options: ReadSegmentOptions): string | null {
  if (!isSegmentId(options.segmentId)) return null;
  const prosePath = path.join(
    options.manualStoryRoot,
    "segments",
    `${options.segmentId}.md`,
  );
  if (!existsSync(prosePath)) return null;
  try {
    return readFileSync(prosePath, "utf8");
  } catch {
    return null;
  }
}

function parseSegmentSidecar(fullPath: string): SegmentSidecar | null {
  try {
    const parsed = YAML.parse(readFileSync(fullPath, "utf8")) as unknown;
    if (!isSegmentSidecar(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isSegmentSidecar(value: unknown): value is SegmentSidecar {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    isSegmentId(obj.id) &&
    typeof obj.title === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.updated_at === "string" &&
    typeof obj.word_count === "number"
  );
}

function isSegmentId(value: string): boolean {
  return SEGMENT_ID_PATTERN.test(value);
}

function numericSegmentSuffix(segmentId: string): number {
  const match = SEGMENT_ID_PATTERN.exec(segmentId);
  if (!match) return 0;
  const n = Number.parseInt(match[1] ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}
