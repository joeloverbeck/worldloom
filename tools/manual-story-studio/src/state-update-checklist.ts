import { readManualStoryMetadata } from "./read/manual-story-metadata.js";
import { listRecords, readRecord } from "./read/records.js";
import { err, ok, type ReadResult } from "./read/result.js";
import type {
  ManualRecord,
  ManualRecordClass,
  SegmentSidecar,
} from "./schema/manual-story.js";
import type { ManualStoryRoot } from "./write/sandbox.js";

export const CHECKLIST_REVIEW_CLASSES: readonly ManualRecordClass[] = [
  "statuses",
  "emotions",
  "beliefs",
  "relationships",
  "objects",
  "plans",
  "clocks",
  "secrets",
  "questions",
  "consequences",
  "obligations",
  "threads",
] as const;

export const CHECKLIST_DISCLAIMER =
  "Review these categories manually. Manual Story Studio has not changed any records.";

export interface StateUpdateChecklistEntry {
  record_class: ManualRecordClass;
  total_records: number;
  cast_referencing_count: number;
}

export interface StateUpdateChecklistPayload {
  segment_id: string;
  last_accepted_segment: string | null;
  involved_cast: string[];
  entries: StateUpdateChecklistEntry[];
  disclaimer: string;
}

export interface BuildChecklistOptions {
  manualStoryRoot: ManualStoryRoot | string;
  sidecar: SegmentSidecar;
}

export function buildStateUpdateChecklist(
  options: BuildChecklistOptions,
): ReadResult<StateUpdateChecklistPayload> {
  const manualStoryRoot = rootPath(options.manualStoryRoot);
  const metadata = readManualStoryMetadata(manualStoryRoot);
  if (!metadata.ok) return err(metadata.error);
  const last_accepted_segment =
    metadata.value.segment_order[metadata.value.segment_order.length - 1] ??
    null;
  const involved_cast =
    options.sidecar.included_record_summary.characters.slice();
  const involvedCastSet = new Set(involved_cast);

  const entries: StateUpdateChecklistEntry[] = [];
  for (const recordClass of CHECKLIST_REVIEW_CLASSES) {
    const summariesResult = listRecords(manualStoryRoot, recordClass);
    if (!summariesResult.ok) return err(summariesResult.error);
    const summaries = summariesResult.value;
    let cast_referencing_count = 0;

    for (const summary of summaries) {
      const record = readRecord(manualStoryRoot, recordClass, summary.id);
      if (!record.ok) return err(record.error);
      if (recordReferencesAnyCast(record.value, involvedCastSet)) {
        cast_referencing_count += 1;
      }
    }

    entries.push({
      record_class: recordClass,
      total_records: summaries.length,
      cast_referencing_count,
    });
  }

  return ok({
    segment_id: options.sidecar.id,
    last_accepted_segment,
    involved_cast,
    entries,
    disclaimer: CHECKLIST_DISCLAIMER,
  });
}

function rootPath(root: ManualStoryRoot | string): string {
  return typeof root === "string" ? root : root.absolutePath;
}

function recordReferencesAnyCast(
  record: ManualRecord,
  involvedCast: ReadonlySet<string>,
): boolean {
  if (involvedCast.size === 0) return false;
  return record.refs.characters.some((id) => involvedCast.has(id));
}
