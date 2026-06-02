// Declarative validator for beat-template YAML bodies. Returns a typed
// BeatTemplate on success or a list of field-path-keyed violations on
// failure. Re-uses the ManualStoryRole enum from schema/manual-story.ts
// as the single source of truth for the cast role enum.

import {
  BEAT_TEMPLATE_BEAT_FUNCTIONS,
  BEAT_TEMPLATE_ID_PATTERN,
  BEAT_TEMPLATE_MOVE_FAMILIES,
  BEAT_TEMPLATE_PRESSURE_TYPES,
  BEAT_TEMPLATE_RELATIONSHIP_AXES,
  BEAT_TEMPLATE_TONE_FITS,
  BEAT_TEMPLATE_TURN_TYPES,
  type BeatTemplate,
} from "../schema/beat-template.js";
import { MANUAL_RECORD_CLASSES } from "../schema/manual-story.js";

const ROLE_VALUES = new Set<string>([
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
]);

const CONTENT_INTENSITY_VALUES = new Set<string>([
  "general",
  "mature",
  "explicit",
]);

const MOVE_FAMILY_SET = new Set<string>(BEAT_TEMPLATE_MOVE_FAMILIES);
const PRESSURE_TYPE_SET = new Set<string>(BEAT_TEMPLATE_PRESSURE_TYPES);
const TONE_FIT_SET = new Set<string>(BEAT_TEMPLATE_TONE_FITS);
const TURN_TYPE_SET = new Set<string>(BEAT_TEMPLATE_TURN_TYPES);
const RELATIONSHIP_AXES_SET = new Set<string>(BEAT_TEMPLATE_RELATIONSHIP_AXES);
const BEAT_FUNCTION_SET = new Set<string>(BEAT_TEMPLATE_BEAT_FUNCTIONS);
const MANUAL_RECORD_CLASS_SET = new Set<string>(MANUAL_RECORD_CLASSES);

export interface BeatTemplateViolation {
  field: string;
  message: string;
}

export type BeatTemplateValidationResult =
  | { valid: true; record: BeatTemplate }
  | { valid: false; violations: BeatTemplateViolation[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function pushMissing(
  violations: BeatTemplateViolation[],
  field: string,
): void {
  violations.push({ field, message: "missing required field" });
}

function validateString(
  violations: BeatTemplateViolation[],
  field: string,
  value: unknown,
): void {
  if (typeof value !== "string") {
    violations.push({
      field,
      message: `expected string, got ${typeof value}`,
    });
  }
}

function validateBoolean(
  violations: BeatTemplateViolation[],
  field: string,
  value: unknown,
): void {
  if (typeof value !== "boolean") {
    violations.push({
      field,
      message: `expected boolean, got ${typeof value}`,
    });
  }
}

function validateStringArray(
  violations: BeatTemplateViolation[],
  field: string,
  value: unknown,
): void {
  if (!isStringArray(value)) {
    violations.push({
      field,
      message: "expected array of strings",
    });
  }
}

function validateEnumString(
  violations: BeatTemplateViolation[],
  field: string,
  value: unknown,
  allowed: Set<string>,
): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    violations.push({
      field,
      message: `value '${String(value)}' not in allowed set: ${[...allowed].join(", ")}`,
    });
  }
}

function validateEnumStringArray(
  violations: BeatTemplateViolation[],
  field: string,
  value: unknown,
  allowed: Set<string>,
): void {
  if (!isStringArray(value)) {
    violations.push({
      field,
      message: "expected array of strings",
    });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    const entry = value[i] as string;
    if (!allowed.has(entry)) {
      violations.push({
        field: `${field}[${i}]`,
        message: `value '${entry}' not in allowed set: ${[...allowed].join(", ")}`,
      });
    }
  }
}

function validateExpectedStateReview(
  violations: BeatTemplateViolation[],
  value: unknown,
): void {
  if (!isStringArray(value)) {
    violations.push({
      field: "expected_state_review",
      message: "expected array of strings",
    });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    const entry = value[i] as string;
    if (!MANUAL_RECORD_CLASS_SET.has(entry)) {
      violations.push({
        field: `expected_state_review[${i}]`,
        message: `value '${entry}' not in allowed set: ${[...MANUAL_RECORD_CLASS_SET].join(", ")}`,
      });
    } else if (entry === "beat-templates") {
      violations.push({
        field: `expected_state_review[${i}]`,
        message: "beat-templates is not a state-review class",
      });
    }
  }
}

function validateClassification(
  violations: BeatTemplateViolation[],
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    violations.push({
      field: "classification",
      message: "expected object",
    });
    return;
  }
  if (!("move_family" in value)) pushMissing(violations, "classification.move_family");
  else validateEnumString(violations, "classification.move_family", value.move_family, MOVE_FAMILY_SET);
  if (!("tags" in value)) pushMissing(violations, "classification.tags");
  else validateStringArray(violations, "classification.tags", value.tags);
  if (!("intensity" in value)) pushMissing(violations, "classification.intensity");
  else validateEnumString(violations, "classification.intensity", value.intensity, CONTENT_INTENSITY_VALUES);
  if (!("tone_fit" in value)) pushMissing(violations, "classification.tone_fit");
  else validateEnumStringArray(violations, "classification.tone_fit", value.tone_fit, TONE_FIT_SET);
}

function validateRoleSlots(
  violations: BeatTemplateViolation[],
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    violations.push({
      field: "role_slots",
      message: "expected object map",
    });
    return;
  }
  for (const [slotName, slotValue] of Object.entries(value)) {
    if (slotName.length === 0) {
      violations.push({
        field: "role_slots",
        message: "slot name must be non-empty string",
      });
      continue;
    }
    const path = `role_slots.${slotName}`;
    if (!isPlainObject(slotValue)) {
      violations.push({
        field: path,
        message: "expected object with compatible_roles",
      });
      continue;
    }
    if (!("compatible_roles" in slotValue)) {
      pushMissing(violations, `${path}.compatible_roles`);
      continue;
    }
    validateEnumStringArray(
      violations,
      `${path}.compatible_roles`,
      slotValue.compatible_roles,
      ROLE_VALUES,
    );
  }
}

function validateRequires(
  violations: BeatTemplateViolation[],
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    violations.push({ field: "requires", message: "expected object" });
    return;
  }
  const fields: Array<[string, (v: unknown) => void]> = [
    ["record_classes_any", (v) => validateStringArray(violations, "requires.record_classes_any", v)],
    ["record_tags_any", (v) => validateStringArray(violations, "requires.record_tags_any", v)],
    ["relationship_axes_any", (v) => validateEnumStringArray(violations, "requires.relationship_axes_any", v, RELATIONSHIP_AXES_SET)],
    ["location_tags_any", (v) => validateStringArray(violations, "requires.location_tags_any", v)],
  ];
  for (const [name, check] of fields) {
    if (!(name in value)) {
      pushMissing(violations, `requires.${name}`);
      continue;
    }
    check(value[name]);
  }
}

function validateExcludes(
  violations: BeatTemplateViolation[],
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    violations.push({ field: "excludes", message: "expected object" });
    return;
  }
  if (!("record_tags_any" in value)) pushMissing(violations, "excludes.record_tags_any");
  else validateStringArray(violations, "excludes.record_tags_any", value.record_tags_any);
  if (!("forbidden_if_secret_tags" in value)) pushMissing(violations, "excludes.forbidden_if_secret_tags");
  else validateStringArray(violations, "excludes.forbidden_if_secret_tags", value.forbidden_if_secret_tags);
}

function validateBeatGuidance(
  violations: BeatTemplateViolation[],
  value: unknown,
): void {
  if (!Array.isArray(value)) {
    violations.push({ field: "beat_guidance", message: "expected array" });
    return;
  }
  if (value.length < 1 || value.length > 5) {
    violations.push({
      field: "beat_guidance",
      message: `expected 1-5 entries, got ${value.length}`,
    });
  }
  for (let i = 0; i < value.length; i++) {
    const entry = value[i];
    const path = `beat_guidance[${i}]`;
    if (!isPlainObject(entry)) {
      violations.push({ field: path, message: "expected object" });
      continue;
    }
    if (!("function" in entry)) pushMissing(violations, `${path}.function`);
    else validateEnumString(violations, `${path}.function`, entry.function, BEAT_FUNCTION_SET);
    if (!("instruction" in entry)) pushMissing(violations, `${path}.instruction`);
    else validateString(violations, `${path}.instruction`, entry.instruction);
  }
}

const TOP_LEVEL_REQUIRED = [
  "id",
  "title",
  "active",
  "pressure_type",
  "turn_type",
  "preconditions_text",
  "do_not_resolve",
  "expected_state_review",
  "stop_after",
  "anti_patterns",
  "classification",
  "role_slots",
  "requires",
  "excludes",
  "beat_guidance",
  "forbidden_inventions",
  "author_notes",
] as const;

const TOP_LEVEL_ALLOWED = new Set<string>(TOP_LEVEL_REQUIRED);

export function validateBeatTemplate(raw: unknown): BeatTemplateValidationResult {
  const violations: BeatTemplateViolation[] = [];
  if (!isPlainObject(raw)) {
    return {
      valid: false,
      violations: [{ field: "<root>", message: "expected object" }],
    };
  }
  for (const field of TOP_LEVEL_REQUIRED) {
    if (!(field in raw)) pushMissing(violations, field);
  }
  for (const key of Object.keys(raw)) {
    if (!TOP_LEVEL_ALLOWED.has(key)) {
      violations.push({ field: key, message: "unknown field" });
    }
  }
  if ("id" in raw) {
    if (typeof raw.id !== "string") {
      violations.push({
        field: "id",
        message: `expected string, got ${typeof raw.id}`,
      });
    } else if (!BEAT_TEMPLATE_ID_PATTERN.test(raw.id)) {
      violations.push({
        field: "id",
        message: `value '${raw.id}' does not match required pattern ^mtemplate-\\d+$`,
      });
    }
  }
  if ("title" in raw) validateString(violations, "title", raw.title);
  if ("active" in raw) validateBoolean(violations, "active", raw.active);
  if ("pressure_type" in raw)
    validateEnumString(violations, "pressure_type", raw.pressure_type, PRESSURE_TYPE_SET);
  if ("turn_type" in raw)
    validateEnumString(violations, "turn_type", raw.turn_type, TURN_TYPE_SET);
  if ("preconditions_text" in raw)
    validateString(violations, "preconditions_text", raw.preconditions_text);
  if ("do_not_resolve" in raw)
    validateStringArray(violations, "do_not_resolve", raw.do_not_resolve);
  if ("expected_state_review" in raw)
    validateExpectedStateReview(violations, raw.expected_state_review);
  if ("stop_after" in raw) validateString(violations, "stop_after", raw.stop_after);
  if ("anti_patterns" in raw)
    validateStringArray(violations, "anti_patterns", raw.anti_patterns);
  if ("classification" in raw) validateClassification(violations, raw.classification);
  if ("role_slots" in raw) validateRoleSlots(violations, raw.role_slots);
  if ("requires" in raw) validateRequires(violations, raw.requires);
  if ("excludes" in raw) validateExcludes(violations, raw.excludes);
  if ("beat_guidance" in raw) validateBeatGuidance(violations, raw.beat_guidance);
  if ("forbidden_inventions" in raw)
    validateStringArray(violations, "forbidden_inventions", raw.forbidden_inventions);
  if ("author_notes" in raw) validateString(violations, "author_notes", raw.author_notes);

  if (violations.length === 0) {
    return { valid: true, record: raw as unknown as BeatTemplate };
  }
  return { valid: false, violations };
}
