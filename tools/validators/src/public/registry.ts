import { crossFileReference } from "../structural/cross-file-reference.js";
import { idUniqueness } from "../structural/id-uniqueness.js";
import { modificationHistoryRetrofit } from "../structural/modification-history-retrofit.js";
import { recordSchemaCompliance } from "../structural/record-schema-compliance.js";
import { rule1NoFloatingFacts } from "../rules/rule1-no-floating-facts.js";
import { rule2NoPureCosmetics } from "../rules/rule2-no-pure-cosmetics.js";
import { rule4NoGlobalizationByAccident } from "../rules/rule4-no-globalization-by-accident.js";
import { rule5NoConsequenceEvasion } from "../rules/rule5-no-consequence-evasion.js";
import { rule6NoSilentRetcons } from "../rules/rule6-no-silent-retcons.js";
import { rule7MysteryReservePreservation } from "../rules/rule7-mystery-reserve-preservation.js";
import { rule11ActionSpace } from "../rules/rule11-action-space.js";
import { rule12Redundancy } from "../rules/rule12-redundancy.js";
import { touchedByCfCompleteness } from "../structural/touched-by-cf-completeness.js";
import { yamlParseIntegrity } from "../structural/yaml-parse-integrity.js";
import type { Validator } from "../framework/types.js";

export const structuralValidators: readonly Validator[] = [
  yamlParseIntegrity,
  idUniqueness,
  crossFileReference,
  recordSchemaCompliance,
  touchedByCfCompleteness,
  modificationHistoryRetrofit
];

export const ruleValidators: readonly Validator[] = [
  rule1NoFloatingFacts,
  rule2NoPureCosmetics,
  rule4NoGlobalizationByAccident,
  rule5NoConsequenceEvasion,
  rule6NoSilentRetcons,
  rule7MysteryReservePreservation,
  rule11ActionSpace,
  rule12Redundancy
];
