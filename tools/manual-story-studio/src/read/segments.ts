import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type { SegmentSidecar } from "../schema/manual-story.js";
import { err, ok, type ReadResult } from "./result.js";

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

export function listSegments(options: ListSegmentsOptions): ReadResult<SegmentListEntry[]> {
  const segmentsDir = path.join(options.manualStoryRoot, "segments");
  if (!existsSync(segmentsDir)) return ok([]);

  const entries: SegmentListEntry[] = [];
  for (const entry of readdirSync(segmentsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = /^SEG-\d+\.yaml$/.exec(entry.name);
    if (!match) continue;

    const sidecarPath = path.join(segmentsDir, entry.name);
    const sidecar = parseSegmentSidecar(sidecarPath);
    if (!sidecar.ok) return err(sidecar.error);
    entries.push({
      id: sidecar.value.id,
      title: sidecar.value.title,
      created_at: sidecar.value.created_at,
      updated_at: sidecar.value.updated_at,
      word_count: sidecar.value.word_count,
    });
  }

  entries.sort((a, b) => numericSegmentSuffix(a.id) - numericSegmentSuffix(b.id));
  return ok(entries);
}

export function readSegmentSidecar(options: ReadSegmentOptions): ReadResult<SegmentSidecar> {
  if (!isSegmentId(options.segmentId)) {
    return err({
      code: "invalid_id_shape",
      path: path.join(options.manualStoryRoot, "segments", `${options.segmentId}.yaml`),
      repair_hint: "Segment id must match SEG-<integer>.",
    });
  }
  const sidecarPath = path.join(
    options.manualStoryRoot,
    "segments",
    `${options.segmentId}.yaml`,
  );
  if (!existsSync(sidecarPath)) {
    return err({
      code: "file_not_found",
      path: sidecarPath,
      repair_hint: `Create segments/${options.segmentId}.yaml or remove the segment reference.`,
    });
  }
  return parseSegmentSidecar(sidecarPath);
}

export function readSegmentBody(options: ReadSegmentOptions): ReadResult<string> {
  if (!isSegmentId(options.segmentId)) {
    return err({
      code: "invalid_id_shape",
      path: path.join(options.manualStoryRoot, "segments", `${options.segmentId}.md`),
      repair_hint: "Segment id must match SEG-<integer>.",
    });
  }
  const prosePath = path.join(
    options.manualStoryRoot,
    "segments",
    `${options.segmentId}.md`,
  );
  if (!existsSync(prosePath)) {
    return err({
      code: "file_not_found",
      path: prosePath,
      repair_hint: `Create segments/${options.segmentId}.md or remove the segment reference.`,
    });
  }
  try {
    return ok(readFileSync(prosePath, "utf8"));
  } catch (cause) {
    return err({
      code: "io_error",
      path: prosePath,
      cause,
      repair_hint: `Check file permissions for segments/${options.segmentId}.md.`,
    });
  }
}

function parseSegmentSidecar(fullPath: string): ReadResult<SegmentSidecar> {
  let text: string;
  try {
    text = readFileSync(fullPath, "utf8");
  } catch (cause) {
    return err({
      code: "io_error",
      path: fullPath,
      cause,
      repair_hint: `Check file permissions for ${fullPath}.`,
    });
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(text) as unknown;
  } catch (cause) {
    return err({
      code: "yaml_parse_failed",
      path: fullPath,
      cause,
      repair_hint: `Fix YAML syntax in ${fullPath}.`,
    });
  }

  if (!isSegmentSidecar(parsed)) {
    return err({
      code: "schema_validation_failed",
      path: fullPath,
      repair_hint: `Segment sidecar at ${fullPath} is missing required fields.`,
    });
  }
  return ok(parsed);
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
