import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
  "mystery_reserve_effect",
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

export interface PerValueFamily {
  value: string;
  family: string;
}

export interface GetCanonicalVocabularyResponse {
  canonical_values: string[];
  coupling?: VocabularyCoupling;
  per_value_coupling?: PerValueCoupling[];
  per_value_family?: PerValueFamily[];
}

function isVocabularyClass(value: string): value is VocabularyClass {
  return (VOCABULARY_CLASSES as readonly string[]).includes(value);
}

type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null;

let mysteryReserveEffectValuesCache: string[] | undefined;

function findRepoRoot(): string {
  const starts = [process.cwd(), __dirname];

  for (const start of starts) {
    let current = path.resolve(start);

    while (true) {
      if (existsSync(path.join(current, "tools", "validators", "src", "schemas", "change-log-entry.schema.json"))) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return path.resolve(__dirname, "..", "..", "..", "..", "..");
}

function asObject(value: JsonValue | undefined): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function mysteryReserveEffectValues(): string[] {
  if (mysteryReserveEffectValuesCache !== undefined) {
    return [...mysteryReserveEffectValuesCache];
  }

  const schemaPath = path.join(findRepoRoot(), "tools", "validators", "src", "schemas", "change-log-entry.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as JsonObject;
  const properties = asObject(schema.properties);
  const scope = asObject(asObject(properties.scope).properties);
  const mysteryReserveEffect = asObject(scope.mystery_reserve_effect);
  const values = mysteryReserveEffect.enum;

  if (!Array.isArray(values) || !values.every((value): value is string => typeof value === "string")) {
    throw new Error("change-log-entry schema is missing scope.mystery_reserve_effect.enum");
  }

  mysteryReserveEffectValuesCache = [...values];
  return [...mysteryReserveEffectValuesCache];
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
    case "mystery_reserve_effect":
      return { canonical_values: mysteryReserveEffectValues() };
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
