import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, locationFor, queryStructuralRecords, stringArray, stringValue, touchedFilesInclude } from "./utils.js";

const FACT_AUTHORITIES_REQUIRING_TRUE_BELIEF = new Set(["branch_local", "canon_candidate", "canon_linked"]);
const NON_TRUE_BELIEF_RELATIONS = new Set(["false", "partly_true", "contested", "branch_counterfactual"]);

export const liePromotedSilently: Validator = {
  name: "lie_promoted_silently",
  severity_mode: "fail",
  applies_to: (ctx: Context) =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_sf_record") === true ||
    touchedFilesInclude(ctx, /^stories\/[^/]+\/_source\/facts\/SF-\d+\.yaml$/),
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const verdicts: Verdict[] = [];
    const storySlugs = new Set(records.map((record) => record.story_slug).filter((slug): slug is string => typeof slug === "string"));

    for (const storySlug of storySlugs) {
      const maps = recordMapsForStory(records, storySlug);

      for (const fact of maps.byType.get("story_fact_record") ?? []) {
        const factParsed = asPlainRecord(fact.parsed);
        const authority = stringValue(factParsed.authority);
        if (authority === undefined || !FACT_AUTHORITIES_REQUIRING_TRUE_BELIEF.has(authority)) {
          continue;
        }

        stringArray(factParsed.derived_from).forEach((referenceId, index) => {
          if (!/^BEL-\d+$/.test(referenceId)) {
            return;
          }

          const belief = maps.byId.get(referenceId);
          if (belief === undefined) {
            return;
          }

          const truthRelation = stringValue(asPlainRecord(belief.parsed).truth_relation);
          if (truthRelation !== undefined && NON_TRUE_BELIEF_RELATIONS.has(truthRelation)) {
            verdicts.push(liePromotedSilentlyVerdict(fact, factParsed, authority, referenceId, truthRelation, index));
          }
        });
      }
    }

    return verdicts;
  }
};

interface RecordMaps {
  byId: Map<string, IndexedRecord>;
  byType: Map<string, IndexedRecord[]>;
}

function recordMapsForStory(records: readonly IndexedRecord[], storySlug: string): RecordMaps {
  const byId = new Map<string, IndexedRecord>();
  const byType = new Map<string, IndexedRecord[]>();

  for (const record of records) {
    if (record.story_slug !== storySlug) {
      continue;
    }
    const parsed = asPlainRecord(record.parsed);
    const id = stringValue(parsed.id);
    byId.set(record.node_id, record);
    if (id !== undefined) {
      byId.set(id, record);
    }
    const typed = byType.get(record.node_type) ?? [];
    typed.push(record);
    byType.set(record.node_type, typed);
  }

  return { byId, byType };
}

function liePromotedSilentlyVerdict(
  fact: IndexedRecord,
  factParsed: Record<string, unknown>,
  authority: string,
  beliefId: string,
  truthRelation: string,
  derivedFromIndex: number
): Verdict {
  const factId = stringValue(factParsed.id) ?? fact.node_id;
  return {
    validator: "lie_promoted_silently",
    severity: "fail",
    code: "lie_promoted_silently",
    message: `${factId} promotes ${beliefId} with truth_relation ${truthRelation} under authority ${authority}; non-true beliefs require authority branch_local_counterfactual`,
    location: locationFor(fact),
    detail: {
      fact_id: factId,
      authority,
      belief_id: beliefId,
      truth_relation: truthRelation,
      reference_path: `derived_from[${derivedFromIndex}]`
    }
  };
}
