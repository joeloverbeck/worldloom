import { readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type {
  ManualStoryMetadata,
  SegmentSidecar,
} from "../schema/manual-story.js";
import { safeWriteFile, type ManualStoryRoot } from "../write/sandbox.js";

export interface CompileManuscriptOptions {
  manualStoryRoot: ManualStoryRoot;
}

export interface CompileManuscriptResult {
  manuscript_path: string;
  segments_compiled: number;
  byte_count: number;
}

export function compileManuscript(
  options: CompileManuscriptOptions,
): CompileManuscriptResult {
  const { manualStoryRoot } = options;
  const metadata = readMetadata(manualStoryRoot.absolutePath);
  const includeTitles = metadata.manuscript.include_segment_titles;
  const fragments = metadata.segment_order.map((segmentId) =>
    renderSegment(manualStoryRoot.absolutePath, segmentId, includeTitles),
  );
  const body = fragments.join("\n\n");
  const manuscript_path = safeWriteFile(manualStoryRoot, "manuscript.md", body);

  return {
    manuscript_path,
    segments_compiled: metadata.segment_order.length,
    byte_count: Buffer.byteLength(body, "utf8"),
  };
}

function readMetadata(manualStoryRoot: string): ManualStoryMetadata {
  const metadataPath = path.join(manualStoryRoot, "manual-story.yaml");
  const parsed = YAML.parse(readFileSync(metadataPath, "utf8")) as unknown;
  return parsed as ManualStoryMetadata;
}

function renderSegment(
  manualStoryRoot: string,
  segmentId: string,
  includeTitle: boolean,
): string {
  const body = readFileSync(
    path.join(manualStoryRoot, "segments", `${segmentId}.md`),
    "utf8",
  );
  if (!includeTitle) return body;

  const sidecar = readSegmentSidecar(manualStoryRoot, segmentId);
  return `## ${sidecar.title}\n\n${body}`;
}

function readSegmentSidecar(
  manualStoryRoot: string,
  segmentId: string,
): SegmentSidecar {
  const sidecarPath = path.join(manualStoryRoot, "segments", `${segmentId}.yaml`);
  const parsed = YAML.parse(readFileSync(sidecarPath, "utf8")) as unknown;
  return parsed as SegmentSidecar;
}
