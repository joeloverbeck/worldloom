import type { Context, Validator, Verdict } from "../framework/types.js";
import { loadStoryMaps, planId, stplanValidatorApplies, fail } from "./stplan-utils.js";

const VALIDATOR = "stplan_id_uniqueness_and_append_only";

export const stplanIdUniquenessAndAppendOnly: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: stplanValidatorApplies,
  run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
    const maps = await loadStoryMaps(ctx);
    const byId = new Map<string, number>();
    const verdicts: Verdict[] = [];
    for (const plan of maps.plans) {
      byId.set(planId(plan), (byId.get(planId(plan)) ?? 0) + 1);
    }
    for (const plan of maps.plans) {
      if ((byId.get(planId(plan)) ?? 0) > 1) {
        verdicts.push(fail(plan, VALIDATOR, "stplan_id_uniqueness_and_append_only.duplicate_id", `${planId(plan)} appears more than once in this story bundle.`));
      }
    }
    return verdicts;
  }
};
