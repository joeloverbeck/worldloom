import { ACTIVE_RECORDS_CLASSES } from "../_helpers/state-snapshot-replay.js";
import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryStructuralRecords,
  stringValue
} from "./utils.js";

export const activeRecordsFullShape: Validator = {
  name: "active_records_full_shape",
  severity_mode: "warn",
  applies_to: (ctx: Context) => ctx.run_mode === "full-world",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    return records
      .filter((record) => record.node_type === "page_record")
      .flatMap((page) => verdictsForPage(page));
  }
};

function verdictsForPage(page: IndexedRecord): Verdict[] {
  const parsed = asPlainRecord(page.parsed);
  const pageId = stringValue(parsed.id) ?? page.node_id;
  const activeRecords = asPlainRecord(asPlainRecord(parsed.state_snapshot).active_records);
  return ACTIVE_RECORDS_CLASSES
    .filter((recordClass) => !Array.isArray(activeRecords[recordClass]))
    .map((recordClass) => missingClassVerdict(page, pageId, recordClass));
}

function missingClassVerdict(
  page: IndexedRecord,
  pageId: string,
  recordClass: string
): Verdict {
  const severity = recordClass === "STCHAR" ? "fail" : "warn";
  return {
    validator: "active_records_full_shape",
    severity,
    code: "active_records_class_key_missing",
    message: `${pageId} state_snapshot.active_records omits ${recordClass}; current-contract page snapshots should materialize every active-record class key, using [] when no records of that class are active.`,
    location: locationFor(page),
    detail: {
      page_id: pageId,
      missing_class: recordClass
    },
    suggested_fix: `Materialize state_snapshot.active_records.${recordClass} as an array, using [] if no ${recordClass} records are active.`
  };
}
