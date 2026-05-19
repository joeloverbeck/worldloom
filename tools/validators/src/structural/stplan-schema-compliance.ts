import type { Verdict } from "../framework/types.js";
import { defineStplanValidator, storyPlanSchemaVerdicts } from "./stplan-utils.js";

const VALIDATOR = "stplan_schema_compliance";

export const stplanSchemaCompliance = defineStplanValidator(VALIDATOR, (plan): Verdict[] =>
  storyPlanSchemaVerdicts(plan)
);
