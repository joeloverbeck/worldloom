import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, storyEmotionSchemaVerdicts } from "./stemo-utils.js";

const VALIDATOR = "stemo_schema_compliance";

export const stemoSchemaCompliance = defineStemoValidator(VALIDATOR, (emotion): Verdict[] =>
  storyEmotionSchemaVerdicts(emotion)
);
