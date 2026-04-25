import {
  CANONICAL_DOMAINS,
  MYSTERY_RESOLUTION_SAFETY_ENUM,
  MYSTERY_STATUS_ENUM,
  VERDICT_ENUM
} from "@worldloom/world-index/public/canonical-vocabularies";

import { createMcpError, type McpError } from "../errors";

export const VOCABULARY_CLASSES = ["domain", "verdict", "mystery_status", "mystery_resolution_safety"] as const;

export type VocabularyClass = (typeof VOCABULARY_CLASSES)[number];

export interface GetCanonicalVocabularyArgs {
  class: VocabularyClass;
}

export interface VocabularyCoupling {
  field: string;
  rule: string;
}

export interface GetCanonicalVocabularyResponse {
  canonical_values: string[];
  coupling?: VocabularyCoupling;
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
  }
}
