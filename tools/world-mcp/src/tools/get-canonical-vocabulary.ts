import {
  CANONICAL_DOMAINS,
  CF_TYPE_EPISTEMIC_PROFILE_REQUIRED,
  CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED,
  CF_TYPE_VALUES,
  CHANGE_TYPE_VALUES,
  ENTITY_KIND_VALUES,
  INVARIANT_CATEGORY_VALUES,
  MYSTERY_RESOLUTION_SAFETY_ENUM,
  MYSTERY_STATUS_ENUM,
  REVISION_DIFFICULTY_VALUES,
  SEC_FILE_CLASS_VALUES,
  VERDICT_ENUM
} from "@worldloom/world-index/public/canonical-vocabularies";

import { createMcpError, type McpError } from "../errors";

export const VOCABULARY_CLASSES = [
  "domain",
  "verdict",
  "mystery_status",
  "mystery_resolution_safety",
  "invariant_category",
  "entity_kind",
  "sec_file_class",
  "change_type",
  "revision_difficulty",
  "cf_type"
] as const;

export type VocabularyClass = (typeof VOCABULARY_CLASSES)[number];

export interface GetCanonicalVocabularyArgs {
  class: VocabularyClass;
}

export interface VocabularyCoupling {
  field: string;
  rule: string;
}

export interface PerValueCoupling {
  value: string;
  requires_epistemic_profile: boolean;
  requires_exception_governance: boolean;
}

export interface GetCanonicalVocabularyResponse {
  canonical_values: string[];
  coupling?: VocabularyCoupling;
  per_value_coupling?: PerValueCoupling[];
}

function isVocabularyClass(value: string): value is VocabularyClass {
  return (VOCABULARY_CLASSES as readonly string[]).includes(value);
}

export async function getCanonicalVocabulary(
  args: GetCanonicalVocabularyArgs
): Promise<GetCanonicalVocabularyResponse | McpError> {
  if (!isVocabularyClass(args.class)) {
    return createMcpError("invalid_input", `Unsupported canonical vocabulary class '${args.class}'.`, {
      supported_classes: [...VOCABULARY_CLASSES]
    });
  }

  switch (args.class) {
    case "domain":
      return { canonical_values: [...CANONICAL_DOMAINS] };
    case "verdict":
      return { canonical_values: [...VERDICT_ENUM] };
    case "mystery_status":
      return { canonical_values: [...MYSTERY_STATUS_ENUM] };
    case "mystery_resolution_safety":
      return {
        canonical_values: [...MYSTERY_RESOLUTION_SAFETY_ENUM],
        coupling: {
          field: "status",
          rule: "forbidden allows only none; active, passive, and passive_depth allow low, medium, or high"
        }
      };
    case "invariant_category":
      return { canonical_values: [...INVARIANT_CATEGORY_VALUES] };
    case "entity_kind":
      return { canonical_values: [...ENTITY_KIND_VALUES] };
    case "sec_file_class":
      return { canonical_values: [...SEC_FILE_CLASS_VALUES] };
    case "change_type":
      return { canonical_values: [...CHANGE_TYPE_VALUES] };
    case "revision_difficulty":
      return { canonical_values: [...REVISION_DIFFICULTY_VALUES] };
    case "cf_type":
      return {
        canonical_values: [...CF_TYPE_VALUES],
        coupling: {
          field: "type",
          rule: "Types in CF_TYPE_EPISTEMIC_PROFILE_REQUIRED require populated epistemic_profile. Types in CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED additionally require populated exception_governance. Validator: record_schema_compliance."
        },
        per_value_coupling: CF_TYPE_VALUES.map((value) => ({
          value,
          requires_epistemic_profile: (CF_TYPE_EPISTEMIC_PROFILE_REQUIRED as readonly string[]).includes(value),
          requires_exception_governance: (CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED as readonly string[]).includes(value)
        }))
      };
  }
}
