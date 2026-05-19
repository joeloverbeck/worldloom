import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, enumVerdicts } from "./stemo-utils.js";

const VALIDATOR = "stemo_enum_compliance";

export const stemoEnumCompliance = defineStemoValidator(VALIDATOR, (emotion): Verdict[] =>
  enumVerdicts(emotion)
);
