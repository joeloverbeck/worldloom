// SPEC-17 Track C1 deprecation context: modification_history[] is the canonical
// post-SPEC-13 audit surface. This validator polices the historical convention
// in one direction only (notes -> history); the reverse direction is
// intentionally unchecked because the engine no longer emits to notes.
// Pre-SPEC-13 CFs with dual notes-paragraph + history-entry records remain
// valid under this one-way check.
import type { Context, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  nestedRecords,
  queryRecordsByType,
  stringValue,
  touchedFilesInclude
} from "./utils.js";

const MODIFIED_NOTE_PATTERN = /Modified\s+(\d{4}-\d{2}-\d{2})\s+by\s+(CH-\d{4})/g;

export const modificationHistoryRetrofit: Validator = {
  name: "modification_history_retrofit",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode !== "incremental" || touchedFilesInclude(ctx, /_source\/canon\/CF-\d{4}\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];
    const records = await queryRecordsByType(ctx, "canon_fact_record");

    for (const record of records) {
      const parsed = asPlainRecord(record.parsed);
      const notes = stringValue(parsed.notes);
      if (!notes) {
        continue;
      }

      const history = nestedRecords(parsed, "modification_history");
      for (const match of notes.matchAll(MODIFIED_NOTE_PATTERN)) {
        const [, date, changeId] = match;
        if (
          !history.some(
            (entry) => stringValue(entry.date) === date && stringValue(entry.change_id) === changeId
          )
        ) {
          verdicts.push({
            validator: "modification_history_retrofit",
            severity: "fail",
            code: "modification_history_retrofit.missing_entry",
            message: `${record.node_id} notes mention Modified ${date} by ${changeId}, but modification_history has no matching entry`,
            location: locationFor(record)
          });
        }
      }
    }

    return verdicts;
  }
};
