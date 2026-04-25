import { adjudicationDiscoveryFields } from "../structural/adjudication-discovery-fields.js";
import { crossFileReference } from "../structural/cross-file-reference.js";
import { idUniqueness } from "../structural/id-uniqueness.js";
import { modificationHistoryRetrofit } from "../structural/modification-history-retrofit.js";
import { recordSchemaCompliance } from "../structural/record-schema-compliance.js";
import { touchedByCfCompleteness } from "../structural/touched-by-cf-completeness.js";
import { yamlParseIntegrity } from "../structural/yaml-parse-integrity.js";
import type { Validator } from "../framework/types.js";

export const structuralValidators: readonly Validator[] = [
  yamlParseIntegrity,
  idUniqueness,
  crossFileReference,
  recordSchemaCompliance,
  touchedByCfCompleteness,
  modificationHistoryRetrofit,
  adjudicationDiscoveryFields
];
