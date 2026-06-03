import YAML from "yaml";

import {
  MANUAL_RECORD_CLASSES,
  type ManualRecordClass,
} from "../schema/manual-story.js";
import { validateBeatTemplate } from "./beat-template-schema.js";

export type ScalarKind = "string" | "boolean" | "number" | "stringOrNumber";

export interface SchemaDef {
  required: string[];
  optional?: string[];
  enums?: Record<string, readonly string[]>;
  stringArrays?: string[];
  scalars?: Record<string, ScalarKind>;
  nullable?: string[];
  pair?: string[];
  nested?: Record<string, SchemaDef>;
  recordOfStrings?: string[];
  pattern?: Record<string, RegExp>;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

const COMMON_RECORD_FIELDS: string[] = [
  "id",
  "title",
  "active",
  "importance",
  "tags",
  "summary",
  "details",
  "refs",
  "prompt_visibility",
  "last_reviewed_after_segment",
  "notes",
];

const COMMON_OPTIONAL_FIELDS: string[] = [];

const COMMON_SCALARS: Record<string, ScalarKind> = {
  id: "string",
  title: "string",
  active: "boolean",
  summary: "string",
  details: "string",
  notes: "string",
};

const COMMON_NULLABLE: string[] = ["last_reviewed_after_segment"];

const COMMON_STRING_ARRAYS: string[] = ["tags"];

const COMMON_ENUMS: Record<string, readonly string[]> = {
  importance: ["low", "medium", "high", "central"] as const,
  prompt_visibility: [
    "always",
    "include_when_relevant",
    "only_if_pinned",
    "never_prompt",
  ] as const,
};

const REFS_SCHEMA: SchemaDef = {
  required: ["characters", "locations", "related_records"],
  stringArrays: ["characters", "locations", "related_records"],
};

const ROLE_ENUM = [
  "viewpoint",
  "primary_actor",
  "opposing_actor",
  "allied_actor",
  "authority",
  "dependent",
  "witness",
  "information_source",
  "pressure_source",
  "social_bridge",
  "background",
] as const;

const URGENCY_ENUM = ["latent", "low", "medium", "high", "overdue"] as const;
const AXIS_LEVEL_ENUM = ["low", "medium", "high", "volatile", "unset"] as const;

function commonBase(): SchemaDef {
  return {
    required: [...COMMON_RECORD_FIELDS],
    optional: [...COMMON_OPTIONAL_FIELDS],
    scalars: { ...COMMON_SCALARS },
    nullable: [...COMMON_NULLABLE],
    stringArrays: [...COMMON_STRING_ARRAYS],
    enums: { ...COMMON_ENUMS },
    nested: { refs: REFS_SCHEMA },
  };
}

function extend(base: SchemaDef, delta: Partial<SchemaDef>): SchemaDef {
  return {
    required: [...base.required, ...(delta.required ?? [])],
    optional: [...(base.optional ?? []), ...(delta.optional ?? [])],
    scalars: { ...(base.scalars ?? {}), ...(delta.scalars ?? {}) },
    nullable: [...(base.nullable ?? []), ...(delta.nullable ?? [])],
    stringArrays: [
      ...(base.stringArrays ?? []),
      ...(delta.stringArrays ?? []),
    ],
    enums: { ...(base.enums ?? {}), ...(delta.enums ?? {}) },
    nested: { ...(base.nested ?? {}), ...(delta.nested ?? {}) },
    pair: [...(base.pair ?? []), ...(delta.pair ?? [])],
    recordOfStrings: [
      ...(base.recordOfStrings ?? []),
      ...(delta.recordOfStrings ?? []),
    ],
    pattern: { ...(base.pattern ?? {}), ...(delta.pattern ?? {}) },
  };
}

const CAST_PROFILE_IDENTITY_SCHEMA: SchemaDef = {
  required: ["one_line", "public_face", "private_pressure"],
  scalars: {
    one_line: "string",
    public_face: "string",
    private_pressure: "string",
  },
};

const CAST_PROFILE_WORLD_PRESSURE_CORE_SCHEMA: SchemaDef = {
  required: [
    "world_produced_wound",
    "active_appetite",
    "self_mythology",
    "irreconcilable_contradiction",
    "relational_charge",
    "moral_psychological_edge",
    "cannot_be_swapped_out_because",
  ],
  scalars: {
    world_produced_wound: "string",
    active_appetite: "string",
    self_mythology: "string",
    irreconcilable_contradiction: "string",
    relational_charge: "string",
    moral_psychological_edge: "string",
    cannot_be_swapped_out_because: "string",
  },
};

const CAST_PROFILE_BODY_AND_PRESENCE_SCHEMA: SchemaDef = {
  required: [
    "physicality",
    "body_limits",
    "habitual_gestures",
    "clothing_or_presentation",
    "social_presentation",
  ],
  scalars: {
    physicality: "string",
    body_limits: "string",
    habitual_gestures: "string",
    clothing_or_presentation: "string",
    social_presentation: "string",
  },
};

const CAST_PROFILE_VOICE_SCHEMA: SchemaDef = {
  required: [
    "baseline",
    "under_pressure",
    "intimacy",
    "evasion",
    "anger",
    "lying",
    "anti_generic_warnings",
  ],
  scalars: {
    baseline: "string",
    under_pressure: "string",
    intimacy: "string",
    evasion: "string",
    anger: "string",
    lying: "string",
  },
  stringArrays: ["anti_generic_warnings"],
};

const CAST_PROFILE_PRESSURE_BEHAVIOR_SCHEMA: SchemaDef = {
  required: [
    "cornered",
    "tempted",
    "humiliated",
    "protecting_attachment",
    "offered_power",
  ],
  scalars: {
    cornered: "string",
    tempted: "string",
    humiliated: "string",
    protecting_attachment: "string",
    offered_power: "string",
  },
};

const CAST_PROFILE_PERCEPTION_SCHEMA: SchemaDef = {
  required: ["notices", "misses", "misreads", "sensory_bias"],
  scalars: {
    notices: "string",
    misses: "string",
    misreads: "string",
    sensory_bias: "string",
  },
};

const CAST_PROFILE_AGENCY_SCHEMA: SchemaDef = {
  required: [
    "default_strategy",
    "risk_style",
    "fallback_style",
    "planning_blind_spots",
  ],
  scalars: {
    default_strategy: "string",
    risk_style: "string",
    fallback_style: "string",
    planning_blind_spots: "string",
  },
};

const CAST_PROFILE_PROSE_CONSTRAINTS_SCHEMA: SchemaDef = {
  required: ["prose_must_not_imply", "forbidden_inventions", "voice_do_not_do"],
  stringArrays: [
    "prose_must_not_imply",
    "forbidden_inventions",
    "voice_do_not_do",
  ],
};

const CAST_SCHEMA: SchemaDef = extend(commonBase(), {
  required: [
    "display_name",
    "roles",
    "identity",
    "world_pressure_core",
    "body_and_presence",
    "voice",
    "pressure_behavior",
    "perception_and_embodiment",
    "agency_and_planning",
    "relationship_behavior",
    "prose_constraints",
  ],
  optional: ["source_world_character"],
  scalars: { display_name: "string" },
  enums: { roles: ROLE_ENUM },
  stringArrays: ["roles"],
  recordOfStrings: ["relationship_behavior"],
  pattern: { source_world_character: /^CHAR-[0-9]+$/ },
  nested: {
    identity: CAST_PROFILE_IDENTITY_SCHEMA,
    world_pressure_core: CAST_PROFILE_WORLD_PRESSURE_CORE_SCHEMA,
    body_and_presence: CAST_PROFILE_BODY_AND_PRESENCE_SCHEMA,
    voice: CAST_PROFILE_VOICE_SCHEMA,
    pressure_behavior: CAST_PROFILE_PRESSURE_BEHAVIOR_SCHEMA,
    perception_and_embodiment: CAST_PROFILE_PERCEPTION_SCHEMA,
    agency_and_planning: CAST_PROFILE_AGENCY_SCHEMA,
    prose_constraints: CAST_PROFILE_PROSE_CONSTRAINTS_SCHEMA,
  },
});

const ENTITY_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["kind"],
  enums: {
    kind: [
      "institution",
      "faction",
      "force",
      "population",
      "animal",
      "other",
    ] as const,
  },
});

const STATUS_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["subject", "kind"],
  scalars: { subject: "string" },
  enums: {
    kind: [
      "life",
      "agency",
      "location",
      "bodily",
      "social",
      "other",
    ] as const,
  },
});

const LOCATION_SCHEMA: SchemaDef = commonBase();

const OBJECT_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["current_location", "current_holder"],
  scalars: { current_location: "string", current_holder: "string" },
  nullable: ["current_location", "current_holder"],
});

const FACT_SCHEMA: SchemaDef = commonBase();

const BELIEF_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["holder", "truth_relation", "confidence"],
  scalars: { holder: "string" },
  enums: {
    truth_relation: [
      "true",
      "false",
      "partly_true",
      "unknown",
      "contested",
    ] as const,
    confidence: ["low", "medium", "high", "certain"] as const,
  },
});

const INTENTION_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["holder", "target"],
  scalars: { holder: "string", target: "string" },
});

const PLAN_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["holder", "target", "visibility"],
  scalars: { holder: "string", target: "string" },
  enums: {
    visibility: ["private", "shared", "factional", "public"] as const,
  },
});

const EMOTION_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["holder", "valence", "intensity"],
  scalars: { holder: "string" },
  enums: {
    valence: ["positive", "mixed", "negative"] as const,
    intensity: ["mild", "moderate", "strong", "overwhelming"] as const,
  },
});

const RELATIONSHIP_AXES_SCHEMA: SchemaDef = {
  required: ["trust", "fear", "attraction", "power", "respect", "familiarity"],
  enums: {
    trust: AXIS_LEVEL_ENUM,
    fear: AXIS_LEVEL_ENUM,
    attraction: AXIS_LEVEL_ENUM,
    power: AXIS_LEVEL_ENUM,
    respect: AXIS_LEVEL_ENUM,
    familiarity: AXIS_LEVEL_ENUM,
  },
};

const RELATIONSHIP_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["between", "axes"],
  optional: ["dominant_axis"],
  scalars: { dominant_axis: "string" },
  pair: ["between"],
  nested: { axes: RELATIONSHIP_AXES_SCHEMA },
});

const THREAD_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["subject", "status"],
  scalars: { subject: "string" },
  enums: {
    status: [
      "open",
      "building",
      "climaxing",
      "resolving",
      "closed",
      "dormant",
    ] as const,
  },
});

const OBLIGATION_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["owed_by", "owed_to", "urgency"],
  scalars: { owed_by: "string", owed_to: "string" },
  enums: { urgency: URGENCY_ENUM },
});

const CONSEQUENCE_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["caused_by_segment", "pending", "urgency"],
  scalars: { caused_by_segment: "string", pending: "boolean" },
  nullable: ["caused_by_segment"],
  enums: { urgency: URGENCY_ENUM },
});

const CLOCK_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["axis", "value", "direction"],
  scalars: { axis: "string", value: "stringOrNumber" },
  enums: {
    direction: ["rising", "falling", "stalled", "unset"] as const,
  },
});

const SECRET_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["held_by", "audience_visibility", "forbidden_reveal_tags"],
  stringArrays: ["held_by", "forbidden_reveal_tags"],
  enums: {
    audience_visibility: [
      "hidden",
      "known_to_holders",
      "rumored",
      "partially_revealed",
      "revealed",
    ] as const,
  },
});

const QUESTION_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["kind", "answer_known", "must_not_resolve_unless"],
  scalars: { answer_known: "boolean" },
  stringArrays: ["must_not_resolve_unless"],
  enums: {
    kind: ["open", "mystery", "forbidden_reveal"] as const,
  },
});

const ARTIFACT_SCHEMA: SchemaDef = extend(commonBase(), {
  required: ["kind", "current_holder", "provenance"],
  scalars: { current_holder: "string", provenance: "string" },
  nullable: ["current_holder"],
  enums: {
    kind: ["physical", "text", "symbolic", "digital"] as const,
  },
});

// Beat-templates have a distinct structural shape (no common record fields;
// nested role_slots map, closed enums for move_family / tone_fit /
// relationship_axes / beat_guidance.function, 1-5 beat_guidance entries) and
// route through the dedicated `validateBeatTemplate` validator rather than
// the SchemaDef framework. This map omits beat-templates intentionally; the
// `validateRecord` dispatch below special-cases that class.
export const MANUAL_RECORD_SCHEMAS: Record<
  Exclude<ManualRecordClass, "beat-templates">,
  SchemaDef
> = {
  cast: CAST_SCHEMA,
  entities: ENTITY_SCHEMA,
  statuses: STATUS_SCHEMA,
  locations: LOCATION_SCHEMA,
  objects: OBJECT_SCHEMA,
  facts: FACT_SCHEMA,
  beliefs: BELIEF_SCHEMA,
  intentions: INTENTION_SCHEMA,
  plans: PLAN_SCHEMA,
  emotions: EMOTION_SCHEMA,
  relationships: RELATIONSHIP_SCHEMA,
  threads: THREAD_SCHEMA,
  obligations: OBLIGATION_SCHEMA,
  consequences: CONSEQUENCE_SCHEMA,
  clocks: CLOCK_SCHEMA,
  secrets: SECRET_SCHEMA,
  questions: QUESTION_SCHEMA,
  artifacts: ARTIFACT_SCHEMA,
};

export const MANUAL_CHARACTER_PROFILE_SCHEMA = CAST_SCHEMA;

const SOURCE_SCHEMA: SchemaDef = {
  required: ["world_commit", "notes"],
  scalars: { world_commit: "string", notes: "string" },
  nullable: ["world_commit"],
};

const PROSE_PREFERENCES_SCHEMA: SchemaDef = {
  required: ["psychic_distance", "dialogue_density", "interiority", "paragraphing"],
  enums: {
    psychic_distance: [
      "deep_close",
      "close",
      "mid",
      "distant",
      "variable",
    ] as const,
    dialogue_density: ["dense", "moment_led", "sparse", "mixed"] as const,
    interiority: ["free_indirect", "filtered", "minimal", "mixed"] as const,
    paragraphing: [
      "literary",
      "journalistic",
      "dialogue_led",
      "mixed",
    ] as const,
  },
};

const STORY_CONTRACT_SCHEMA: SchemaDef = {
  required: [
    "premise",
    "tone",
    "pov",
    "tense",
    "content_intensity",
    "explicitness",
    "language_register",
    "prose_preferences",
  ],
  scalars: {
    premise: "string",
    tone: "string",
    explicitness: "string",
  },
  enums: {
    pov: ["first", "close third", "distant third", "omniscient"] as const,
    tense: ["past", "present"] as const,
    content_intensity: ["general", "mature", "explicit"] as const,
    language_register: [
      "casual",
      "literary",
      "formal",
      "period_voice",
      "colloquial",
      "mixed",
    ] as const,
  },
  nested: { prose_preferences: PROSE_PREFERENCES_SCHEMA },
};

const PROMPT_POLICY_SCHEMA: SchemaDef = {
  required: [
    "save_prompts",
    "require_moment_directive",
    "default_beat_count",
    "include_recent_segments",
    "recent_template_advisory_window",
  ],
  scalars: {
    save_prompts: "boolean",
    require_moment_directive: "boolean",
    default_beat_count: "string",
    include_recent_segments: "number",
    recent_template_advisory_window: "number",
  },
};

const MANUSCRIPT_POLICY_SCHEMA: SchemaDef = {
  required: ["compile_on_segment_save", "include_segment_titles", "allow_reorder"],
  scalars: {
    compile_on_segment_save: "boolean",
    include_segment_titles: "boolean",
    allow_reorder: "boolean",
  },
};

export const MANUAL_STORY_METADATA_SCHEMA: SchemaDef = {
  required: [
    "schema_version",
    "world_slug",
    "manual_story_slug",
    "title",
    "created_at",
    "updated_at",
    "source",
    "story_contract",
    "cast_order",
    "segment_order",
    "prompt_policy",
    "manuscript",
  ],
  scalars: {
    schema_version: "string",
    world_slug: "string",
    manual_story_slug: "string",
    title: "string",
    created_at: "string",
    updated_at: "string",
  },
  enums: {
    schema_version: ["manual-story.v1"] as const,
  },
  stringArrays: ["cast_order", "segment_order"],
  nested: {
    source: SOURCE_SCHEMA,
    story_contract: STORY_CONTRACT_SCHEMA,
    prompt_policy: PROMPT_POLICY_SCHEMA,
    manuscript: MANUSCRIPT_POLICY_SCHEMA,
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function describePath(fieldPath: string, field: string): string {
  return fieldPath ? `${fieldPath}.${field}` : field;
}

function validateScalar(
  fieldPath: string,
  kind: ScalarKind,
  value: unknown,
  errors: ValidationError[],
): void {
  if (kind === "string") {
    if (typeof value !== "string") {
      errors.push({
        field: fieldPath,
        message: `expected string, got ${typeof value}`,
      });
    }
    return;
  }
  if (kind === "boolean") {
    if (typeof value !== "boolean") {
      errors.push({
        field: fieldPath,
        message: `expected boolean, got ${typeof value}`,
      });
    }
    return;
  }
  if (kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push({
        field: fieldPath,
        message: `expected number, got ${typeof value}`,
      });
    }
    return;
  }
  if (kind === "stringOrNumber") {
    if (
      typeof value !== "string" &&
      (typeof value !== "number" || !Number.isFinite(value))
    ) {
      errors.push({
        field: fieldPath,
        message: `expected string or number, got ${typeof value}`,
      });
    }
    return;
  }
}

function validateObject(
  parsed: unknown,
  schema: SchemaDef,
  fieldPath: string,
  errors: ValidationError[],
): void {
  if (!isPlainObject(parsed)) {
    errors.push({
      field: fieldPath || "<root>",
      message: `expected object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
    });
    return;
  }

  for (const field of schema.required) {
    if (!(field in parsed)) {
      errors.push({
        field: describePath(fieldPath, field),
        message: "missing required field",
      });
    }
  }

  const allowedKeys = new Set<string>([
    ...schema.required,
    ...(schema.optional ?? []),
  ]);

  for (const key of Object.keys(parsed)) {
    if (!allowedKeys.has(key)) {
      errors.push({
        field: describePath(fieldPath, key),
        message: `unknown field`,
      });
    }
  }

  const nullableFields = new Set(schema.nullable ?? []);
  const enumFields = schema.enums ?? {};
  const scalarFields = schema.scalars ?? {};
  const arrayFields = new Set(schema.stringArrays ?? []);
  const pairFields = new Set(schema.pair ?? []);
  const recordFields = new Set(schema.recordOfStrings ?? []);
  const nestedFields = schema.nested ?? {};
  const patternFields = schema.pattern ?? {};

  for (const [field, value] of Object.entries(parsed)) {
    const path = describePath(fieldPath, field);

    if (value === null) {
      if (nullableFields.has(field)) {
        continue;
      }
      errors.push({ field: path, message: "value must not be null" });
      continue;
    }

    if (enumFields[field]) {
      const allowed = enumFields[field];
      if (arrayFields.has(field)) {
        if (!isStringArray(value)) {
          errors.push({
            field: path,
            message: "expected array of strings",
          });
          continue;
        }
        for (let i = 0; i < value.length; i++) {
          const entry = value[i] as string;
          if (!allowed.includes(entry)) {
            errors.push({
              field: `${path}[${i}]`,
              message: `value '${entry}' not in allowed set: ${allowed.join(", ")}`,
            });
          }
        }
        continue;
      }
      if (typeof value !== "string" || !allowed.includes(value)) {
        errors.push({
          field: path,
          message: `value '${String(value)}' not in allowed set: ${allowed.join(", ")}`,
        });
      }
      continue;
    }

    if (arrayFields.has(field)) {
      if (!isStringArray(value)) {
        errors.push({ field: path, message: "expected array of strings" });
      }
      continue;
    }

    if (pairFields.has(field)) {
      if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        !value.every((entry) => typeof entry === "string")
      ) {
        errors.push({
          field: path,
          message: "expected pair of two strings",
        });
      }
      continue;
    }

    if (recordFields.has(field)) {
      if (!isPlainObject(value)) {
        errors.push({
          field: path,
          message: "expected object map of string to string",
        });
        continue;
      }
      for (const [k, v] of Object.entries(value)) {
        if (typeof v !== "string") {
          errors.push({
            field: `${path}.${k}`,
            message: "expected string value",
          });
        }
      }
      continue;
    }

    if (nestedFields[field]) {
      validateObject(value, nestedFields[field], path, errors);
      continue;
    }

    if (scalarFields[field]) {
      validateScalar(path, scalarFields[field], value, errors);
    }

    if (patternFields[field]) {
      if (typeof value !== "string") {
        errors.push({ field: path, message: "expected string" });
      } else if (!patternFields[field].test(value)) {
        errors.push({
          field: path,
          message: `value '${value}' does not match required pattern ${patternFields[field].source}`,
        });
      }
    }
  }
}

export function validateAgainstSchema(
  parsed: unknown,
  schema: SchemaDef,
): ValidationResult {
  const errors: ValidationError[] = [];
  validateObject(parsed, schema, "", errors);
  if (errors.length === 0) {
    return { ok: true };
  }
  return { ok: false, errors };
}

export function validateRecord(
  className: ManualRecordClass,
  parsed: unknown,
): ValidationResult {
  if (className === "beat-templates") {
    const result = validateBeatTemplate(parsed);
    if (result.valid) return { ok: true };
    return {
      ok: false,
      errors: result.violations.map((v) => ({
        field: v.field,
        message: v.message,
      })),
    };
  }
  const schema = MANUAL_RECORD_SCHEMAS[className];
  return validateAgainstSchema(parsed, schema);
}

export function validateManualStoryMetadata(
  parsed: unknown,
): ValidationResult {
  return validateAgainstSchema(parsed, MANUAL_STORY_METADATA_SCHEMA);
}

export type ParseValidateResult<T> =
  | { ok: true; parsed: T }
  | { ok: false; errors: ValidationError[] };

export function parseAndValidateYaml<T>(
  yamlText: string,
  schema: SchemaDef,
): ParseValidateResult<T> {
  let parsed: unknown;
  try {
    parsed = YAML.parse(yamlText);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          field: "<root>",
          message: `yaml parse error: ${(error as Error).message}`,
        },
      ],
    };
  }
  const result = validateAgainstSchema(parsed, schema);
  if (!result.ok) {
    return result;
  }
  return { ok: true, parsed: parsed as T };
}

export function listAllRecordClasses(): readonly ManualRecordClass[] {
  return MANUAL_RECORD_CLASSES;
}
