import type { Verdict } from "../framework/types.js";
import { constrainingEffectHasDownstreamGrounding, defineStemoValidator, emotionField, fail, holderHasCompatibleAgency } from "./stemo-utils.js";

const VALIDATOR = "stemo_agency_effect_compatibility";

// FOUNDATIONS Rule 1 and Rule 5 require consequence-bearing affective claims to
// surface as matching downstream state, not as unrelated witness-absence notes.
export const stemoAgencyEffectCompatibility = defineStemoValidator(VALIDATOR, (emotion, _ctx, maps): Verdict[] => {
  if (emotionField(emotion, "agency_effect") !== "constraining") {
    return [];
  }
  if (holderHasCompatibleAgency(emotion, maps) || constrainingEffectHasDownstreamGrounding(emotion, maps)) {
    return [];
  }
  return [fail(emotion, VALIDATOR, "stemo_agency_effect_compatibility.unexplained_constraining_effect", "agency_effect: constraining requires a compatible active STSTAT.agency (constrained, coerced, captive, incapacitated, unconscious, dead) or downstream grounding in CHC.grounded_in.records[], holder-matched STPLAN.derived_from[], or holder-participating SREL.derived_from[].")];
});
