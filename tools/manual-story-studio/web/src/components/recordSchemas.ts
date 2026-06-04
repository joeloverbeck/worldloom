// Frontend-only declarative schemas used by RecordForm to render the
// correct field controls per class. Mirror of the backend
// MANUAL_RECORD_SCHEMAS — kept here so the bundler doesn't pull the
// node-side schema module into the browser bundle.

import type { ManualRecordClass } from "../types/manual-story.js";

export type FieldKind =
  | { kind: "string" }
  | { kind: "boolean" }
  | { kind: "number" }
  | { kind: "stringOrNumber" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "stringArray" }
  | { kind: "enumArray"; values: readonly string[] }
  | { kind: "recordRefArray"; classes: readonly ManualRecordClass[] }
  | { kind: "pair"; class: ManualRecordClass }
  | { kind: "recordOfStrings" }
  | { kind: "nullableString" }
  | { kind: "readonlyString" };

export interface FieldDef {
  field: string;
  label: string;
  required: boolean;
  kind: FieldKind;
}

const URGENCY_VALUES = ["latent", "low", "medium", "high", "overdue"] as const;
const AXIS_LEVEL_VALUES = [
  "low",
  "medium",
  "high",
  "volatile",
  "unset",
] as const;
const ROLE_VALUES = [
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

// beat-templates intentionally omitted from this map — its dedicated
// CRUD UI (BeatTemplates.tsx + BeatTemplateForm.tsx) per SPEC-104 owns
// the form rendering. The generic RecordForm + Records page do not
// dispatch to beat-templates (no entry in the per-class map).
export const PER_CLASS_FIELDS: Record<
  Exclude<ManualRecordClass, "beat-templates">,
  FieldDef[]
> = {
  cast: [
    { field: "display_name", label: "Display name", required: true, kind: { kind: "string" } },
    {
      field: "roles",
      label: "Roles",
      required: true,
      kind: { kind: "enumArray", values: ROLE_VALUES },
    },
  ],
  entities: [
    {
      field: "kind",
      label: "Kind",
      required: true,
      kind: {
        kind: "enum",
        values: ["institution", "faction", "force", "population", "animal", "other"] as const,
      },
    },
  ],
  statuses: [
    { field: "subject", label: "Subject (mchar/mloc/mobj)", required: true, kind: { kind: "string" } },
    {
      field: "kind",
      label: "Kind",
      required: true,
      kind: {
        kind: "enum",
        values: ["life", "agency", "location", "bodily", "social", "other"] as const,
      },
    },
  ],
  locations: [],
  objects: [
    {
      field: "current_location",
      label: "Current location",
      required: true,
      kind: { kind: "nullableString" },
    },
    {
      field: "current_holder",
      label: "Current holder",
      required: true,
      kind: { kind: "nullableString" },
    },
  ],
  facts: [],
  beliefs: [
    { field: "holder", label: "Holder", required: true, kind: { kind: "string" } },
    {
      field: "truth_relation",
      label: "Truth relation",
      required: true,
      kind: {
        kind: "enum",
        values: ["true", "false", "partly_true", "unknown", "contested"] as const,
      },
    },
    {
      field: "confidence",
      label: "Confidence",
      required: true,
      kind: { kind: "enum", values: ["low", "medium", "high", "certain"] as const },
    },
  ],
  intentions: [
    { field: "holder", label: "Holder", required: true, kind: { kind: "string" } },
    { field: "target", label: "Target", required: true, kind: { kind: "string" } },
  ],
  plans: [
    { field: "holder", label: "Holder", required: true, kind: { kind: "string" } },
    { field: "target", label: "Target", required: true, kind: { kind: "string" } },
    {
      field: "visibility",
      label: "Visibility",
      required: true,
      kind: {
        kind: "enum",
        values: ["private", "shared", "factional", "public"] as const,
      },
    },
  ],
  emotions: [
    { field: "holder", label: "Holder", required: true, kind: { kind: "string" } },
    {
      field: "valence",
      label: "Valence",
      required: true,
      kind: { kind: "enum", values: ["positive", "mixed", "negative"] as const },
    },
    {
      field: "intensity",
      label: "Intensity",
      required: true,
      kind: {
        kind: "enum",
        values: ["mild", "moderate", "strong", "overwhelming"] as const,
      },
    },
  ],
  relationships: [
    {
      field: "between",
      label: "Between (pair of mchar)",
      required: true,
      kind: { kind: "pair", class: "cast" },
    },
    {
      field: "dominant_axis",
      label: "Dominant axis",
      required: false,
      kind: { kind: "string" },
    },
  ],
  threads: [
    { field: "subject", label: "Subject", required: true, kind: { kind: "string" } },
    {
      field: "status",
      label: "Status",
      required: true,
      kind: {
        kind: "enum",
        values: ["open", "building", "climaxing", "resolving", "closed", "dormant"] as const,
      },
    },
  ],
  obligations: [
    { field: "owed_by", label: "Owed by (mchar)", required: true, kind: { kind: "string" } },
    { field: "owed_to", label: "Owed to (mchar)", required: true, kind: { kind: "string" } },
    {
      field: "urgency",
      label: "Urgency",
      required: true,
      kind: { kind: "enum", values: URGENCY_VALUES },
    },
  ],
  consequences: [
    {
      field: "caused_by_segment",
      label: "Caused by segment (SEG-*)",
      required: true,
      kind: { kind: "nullableString" },
    },
    { field: "pending", label: "Pending", required: true, kind: { kind: "boolean" } },
    {
      field: "urgency",
      label: "Urgency",
      required: true,
      kind: { kind: "enum", values: URGENCY_VALUES },
    },
  ],
  clocks: [
    { field: "axis", label: "Axis", required: true, kind: { kind: "string" } },
    { field: "value", label: "Value", required: true, kind: { kind: "stringOrNumber" } },
    {
      field: "direction",
      label: "Direction",
      required: true,
      kind: {
        kind: "enum",
        values: ["rising", "falling", "stalled", "unset"] as const,
      },
    },
  ],
  secrets: [
    {
      field: "held_by",
      label: "Held by",
      required: true,
      kind: { kind: "recordRefArray", classes: ["cast"] },
    },
    {
      field: "audience_visibility",
      label: "Audience visibility",
      required: true,
      kind: {
        kind: "enum",
        values: [
          "hidden",
          "known_to_holders",
          "rumored",
          "partially_revealed",
          "revealed",
        ] as const,
      },
    },
    {
      field: "forbidden_reveal_tags",
      label: "Forbidden reveal tags",
      required: true,
      kind: { kind: "stringArray" },
    },
  ],
  questions: [
    {
      field: "kind",
      label: "Kind",
      required: true,
      kind: {
        kind: "enum",
        values: ["open", "mystery", "forbidden_reveal"] as const,
      },
    },
    { field: "answer_known", label: "Answer known", required: true, kind: { kind: "boolean" } },
    {
      field: "must_not_resolve_unless",
      label: "Must not resolve unless",
      required: true,
      kind: { kind: "stringArray" },
    },
  ],
  artifacts: [
    {
      field: "kind",
      label: "Kind",
      required: true,
      kind: {
        kind: "enum",
        values: ["physical", "text", "symbolic", "digital"] as const,
      },
    },
    {
      field: "current_holder",
      label: "Current holder",
      required: true,
      kind: { kind: "nullableString" },
    },
    { field: "provenance", label: "Provenance", required: true, kind: { kind: "string" } },
  ],
};

export const RELATIONSHIP_AXIS_FIELDS = [
  "trust",
  "fear",
  "attraction",
  "power",
  "respect",
  "familiarity",
] as const;

export const RELATIONSHIP_AXIS_VALUES = AXIS_LEVEL_VALUES;
export const ROLE_VALUE_LIST = ROLE_VALUES;
