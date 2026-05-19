import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { locationFor, queryStructuralRecords, touchedFilesInclude } from "./utils.js";
import { readSeIntroductions } from "./midstory-introduction-utils.js";

const VALIDATOR = "record_introduction_uniqueness";

export const recordIntroductionUniqueness: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_se_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/events\/SE-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    return records.flatMap((record) =>
      record.node_type === "story_event_record" ? duplicateIntroductionVerdicts(record) : []
    );
  }
};

function duplicateIntroductionVerdicts(event: IndexedRecord): Verdict[] {
  const seen = new Map<string, number>();
  const verdicts: Verdict[] = [];

  for (const [index, intro] of readSeIntroductions(event).entries()) {
    const firstIndex = seen.get(intro.recordId);
    if (firstIndex === undefined) {
      seen.set(intro.recordId, index);
      continue;
    }

    verdicts.push({
      validator: VALIDATOR,
      severity: "fail",
      code: "record_introduction_duplicate_record_id",
      message: `${event.node_id} introduces ${intro.recordId} more than once in record_introductions[].`,
      location: locationFor(event),
      detail: {
        event_id: event.node_id,
        record_id: intro.recordId,
        first_index: firstIndex,
        duplicate_index: index
      },
      suggested_fix: "Keep one record_introductions[] entry per introduced record_id on each SE record."
    });
  }

  return verdicts;
}
