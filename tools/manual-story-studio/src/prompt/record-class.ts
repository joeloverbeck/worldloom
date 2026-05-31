import {
  MANUAL_RECORD_CLASSES,
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecord,
  type ManualRecordClass,
} from "../schema/manual-story.js";

// Reverse lookup table mapping each prefix back to its record class.
// MANUAL_RECORD_CLASS_PREFIXES is the canonical source; this is a pure
// derivation populated at module load.
const PREFIX_TO_CLASS: Map<string, ManualRecordClass> = new Map(
  MANUAL_RECORD_CLASSES.map((cls) => [MANUAL_RECORD_CLASS_PREFIXES[cls], cls]),
);

export function classifyManualRecordId(id: string): ManualRecordClass | null {
  const m = /^([a-z]+)-\d+$/.exec(id);
  if (!m || m[1] === undefined) return null;
  return PREFIX_TO_CLASS.get(m[1]) ?? null;
}

export function classifyManualRecord(
  record: ManualRecord,
): ManualRecordClass | null {
  return classifyManualRecordId(record.id);
}
