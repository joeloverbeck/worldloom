import { readManualStoryMetadata } from "../read/manual-story-metadata.js";
import { readSegmentBody, readSegmentSidecar } from "../read/segments.js";
import { ok, type ReadResult } from "../read/result.js";
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
): ReadResult<CompileManuscriptResult> {
  const { manualStoryRoot } = options;
  const metadataResult = readManualStoryMetadata(manualStoryRoot.absolutePath);
  if (!metadataResult.ok) return metadataResult;
  const metadata = metadataResult.value;
  const includeTitles = metadata.manuscript.include_segment_titles;
  const fragments: string[] = [];
  for (const segmentId of metadata.segment_order) {
    const rendered = renderSegment(
      manualStoryRoot.absolutePath,
      segmentId,
      includeTitles,
    );
    if (!rendered.ok) return rendered;
    fragments.push(rendered.value);
  }
  const body = fragments.join("\n\n");
  const manuscript_path = safeWriteFile(manualStoryRoot, "manuscript.md", body);

  return ok({
    manuscript_path,
    segments_compiled: metadata.segment_order.length,
    byte_count: Buffer.byteLength(body, "utf8"),
  });
}

function renderSegment(
  manualStoryRoot: string,
  segmentId: string,
  includeTitle: boolean,
): ReadResult<string> {
  const body = readSegmentBody({ manualStoryRoot, segmentId });
  if (!body.ok) return body;

  const sidecar = readSegmentSidecar({ manualStoryRoot, segmentId });
  if (!sidecar.ok) return sidecar;

  if (!includeTitle) return ok(body.value);
  return ok(`## ${sidecar.value.title}\n\n${body.value}`);
}
