import type { Verdict } from "../framework/types.js";
import { defineStemoValidator, emotionField, fail, holderHasCompatibleAgency, sameEventExplainsConstrainedAgency } from "./stemo-utils.js";

const VALIDATOR = "stemo_agency_effect_compatibility";

export const stemoAgencyEffectCompatibility = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  if (emotionField(emotion, "agency_effect") !== "constraining") {
    return [];
  }
  if (holderHasCompatibleAgency(emotion, maps) || sameEventExplainsConstrainedAgency(emotion, maps)) {
    return [];
  }
  return [fail(emotion, VALIDATOR, "stemo_agency_effect_compatibility.unexplained_constraining_effect", "agency_effect: constraining requires compatible active STSTAT.agency or same-event plan_relation/non_propagation rationale.")];
});
