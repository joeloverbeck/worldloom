import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, stringArray, stringValue, touchedFilesInclude } from "../structural/utils.js";

const VALIDATOR = "chc_grounded_in_artifact_accessible";
const CODE = "chc_grounded_in_da_not_active";
const DA_ID = /^DA-\d+$/;

export const ruleChcGroundedInArtifactAccessible: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryPageOrChoicePatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/_source\/(?:pages\/PG-\d+|choices\/CHC-\d+)\.yaml$|(?:^|\/)_source\/(?:pages\/PG-\d+|choices\/CHC-\d+)\.yaml$/)),
  skip_reason: "story page or CHC grounding only",
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const storyScope = ctx.story_slug === undefined ? {} : { story_slug: ctx.story_slug };
    const pages = await ctx.index.query({
      record_type: "page_record",
      world_slug: ctx.world_slug,
      ...storyScope
    });
    const choices = await ctx.index.query({
      record_type: "choice_record",
      world_slug: ctx.world_slug,
      ...storyScope
    });
    const choicesById = new Map<string, IndexedRecord>();
    for (const choice of choices) {
      choicesById.set(recordId(choice), choice);
    }

    const verdicts: Verdict[] = [];
    for (const page of pages) {
      const pageParsed = asPlainRecord(page.parsed);
      const activeChoiceIds = activeRecordIds(pageParsed, "CHC");
      const activeDaIds = activeRecordIds(pageParsed, "DA");
      for (const choiceId of activeChoiceIds) {
        const choice = choicesById.get(choiceId);
        if (!choice) {
          continue;
        }
        const groundedRecords = stringArray(asPlainRecord(asPlainRecord(choice.parsed).grounded_in).records);
        groundedRecords.forEach((id, index) => {
          if (DA_ID.test(id) && !activeDaIds.has(id)) {
            verdicts.push(inaccessibleDaVerdict(page, choice, id, index));
          }
        });
      }
    }

    return verdicts;
  }
};

function isStoryPageOrChoicePatch(patch: { op: string }): boolean {
  return patch.op === "create_pg_record" || patch.op === "create_chc_record";
}

function activeRecordIds(page: Record<string, unknown>, recordClass: string): Set<string> {
  const snapshotActiveRecords = asPlainRecord(page.state_snapshot).active_records;
  const activeRecords = asPlainRecord(snapshotActiveRecords);
  const value = activeRecords[recordClass];
  if (Array.isArray(value)) {
    return new Set(stringArray(value));
  }
  if (Array.isArray(snapshotActiveRecords)) {
    return new Set(
      stringArray(snapshotActiveRecords).filter((id) =>
        recordClass === "DA" ? DA_ID.test(id) : id.startsWith(`${recordClass}-`)
      )
    );
  }
  return new Set();
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id.split(":").pop() ?? record.node_id;
}

function inaccessibleDaVerdict(page: IndexedRecord, choice: IndexedRecord, daId: string, index: number): Verdict {
  const pageId = recordId(page);
  const choiceId = recordId(choice);
  return {
    validator: VALIDATOR,
    severity: "fail",
    code: CODE,
    message: `${choiceId} grounds in ${daId}, but ${daId} is not active in ${pageId}.state_snapshot.active_records.DA`,
    location: locationFor(choice),
    detail: {
      page_id: pageId,
      choice_id: choiceId,
      da_id: daId,
      reference_path: `grounded_in.records[${index}]`
    },
    suggested_fix: `Add ${daId} to ${pageId}.state_snapshot.active_records.DA, ground ${choiceId} in an active DA, or remove the stale DA grounding reference.`
  };
}
