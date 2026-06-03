import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import type { CreateResult } from "../api/records.js";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges.js";
import {
  MANUAL_RECORD_CLASSES,
  type ManualRecord,
  type ManualRecordClass,
} from "../types/manual-story.js";
import { RecordPicker } from "./RecordPicker.js";
import {
  PER_CLASS_FIELDS,
  RELATIONSHIP_AXIS_FIELDS,
  RELATIONSHIP_AXIS_VALUES,
} from "./recordSchemas.js";

export interface RecordFormProps {
  recordClass: ManualRecordClass;
  initial?: Partial<ManualRecord>;
  onSave: (
    record: ManualRecord,
    opts?: { overrideBrokenRefs?: boolean },
  ) => boolean | void | Promise<boolean | void>;
  onCancel: () => void;
  saveError?: Exclude<CreateResult, { ok: true }> | null;
}

const IMPORTANCE_VALUES = ["low", "medium", "high", "central"] as const;
const PROMPT_VISIBILITY_VALUES = [
  "always",
  "include_when_relevant",
  "only_if_pinned",
  "never_prompt",
] as const;

function defaultForKind(kind: { kind: string; values?: readonly string[] }): unknown {
  switch (kind.kind) {
    case "string":
    case "readonlyString":
      return "";
    case "boolean":
      return false;
    case "number":
      return 0;
    case "stringOrNumber":
      return "";
    case "enum":
      return kind.values?.[0] ?? "";
    case "enumArray":
      return [];
    case "stringArray":
      return [];
    case "pair":
      return ["", ""];
    case "recordOfStrings":
      return {};
    case "nullableString":
      return null;
    default:
      return null;
  }
}

function ensureRefs(value: unknown): {
  characters: string[];
  locations: string[];
  related_records: string[];
} {
  if (typeof value !== "object" || value === null) {
    return { characters: [], locations: [], related_records: [] };
  }
  const obj = value as Record<string, unknown>;
  return {
    characters: Array.isArray(obj.characters)
      ? (obj.characters as string[])
      : [],
    locations: Array.isArray(obj.locations) ? (obj.locations as string[]) : [],
    related_records: Array.isArray(obj.related_records)
      ? (obj.related_records as string[])
      : [],
  };
}

function ChipInput(props: {
  value: string[];
  onChange: (next: string[]) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
        {props.value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            style={{
              background: "#eee",
              borderRadius: 4,
              padding: "1px 6px",
              fontSize: 12,
            }}
          >
            {v}
            <button
              type="button"
              aria-label={`remove ${v}`}
              onClick={() => {
                const next = [...props.value];
                next.splice(i, 1);
                props.onChange(next);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                marginLeft: 4,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label={props.ariaLabel}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && draft.trim().length > 0) {
            e.preventDefault();
            props.onChange([...props.value, draft.trim()]);
            setDraft("");
          }
        }}
        placeholder="add then Enter"
      />
    </div>
  );
}

function FieldRow(props: {
  label: string;
  required: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", margin: "8px 0" }}>
      <span style={{ display: "block", fontWeight: 500 }}>
        {props.label}
        {props.required ? " *" : ""}
      </span>
      {props.children}
      {props.error ? (
        <span role="alert" style={{ color: "#b00", fontSize: 12 }}>
          {props.error}
        </span>
      ) : null}
    </label>
  );
}

function FormGroup(props: { children: React.ReactNode }) {
  return <div style={{ margin: "8px 0" }}>{props.children}</div>;
}

const CAST_NESTED_SECTIONS: Array<{
  key: keyof CastFormState["nested"];
  title: string;
  fields: Array<{ key: string; multiline?: boolean; chipArray?: boolean }>;
}> = [
  {
    key: "identity",
    title: "Identity",
    fields: [
      { key: "one_line", multiline: true },
      { key: "public_face", multiline: true },
      { key: "private_pressure", multiline: true },
    ],
  },
  {
    key: "world_pressure_core",
    title: "World Pressure Core",
    fields: [
      { key: "world_produced_wound", multiline: true },
      { key: "active_appetite", multiline: true },
      { key: "self_mythology", multiline: true },
      { key: "irreconcilable_contradiction", multiline: true },
      { key: "relational_charge", multiline: true },
      { key: "moral_psychological_edge", multiline: true },
      { key: "cannot_be_swapped_out_because", multiline: true },
    ],
  },
  {
    key: "body_and_presence",
    title: "Body and Presence",
    fields: [
      { key: "physicality", multiline: true },
      { key: "body_limits", multiline: true },
      { key: "habitual_gestures", multiline: true },
      { key: "clothing_or_presentation", multiline: true },
      { key: "social_presentation", multiline: true },
    ],
  },
  {
    key: "voice",
    title: "Voice",
    fields: [
      { key: "baseline", multiline: true },
      { key: "under_pressure", multiline: true },
      { key: "intimacy", multiline: true },
      { key: "evasion", multiline: true },
      { key: "anger", multiline: true },
      { key: "lying", multiline: true },
      { key: "anti_generic_warnings", chipArray: true },
    ],
  },
  {
    key: "pressure_behavior",
    title: "Pressure Behavior",
    fields: [
      { key: "cornered", multiline: true },
      { key: "tempted", multiline: true },
      { key: "humiliated", multiline: true },
      { key: "protecting_attachment", multiline: true },
      { key: "offered_power", multiline: true },
    ],
  },
  {
    key: "perception_and_embodiment",
    title: "Perception and Embodiment",
    fields: [
      { key: "notices", multiline: true },
      { key: "misses", multiline: true },
      { key: "misreads", multiline: true },
      { key: "sensory_bias", multiline: true },
    ],
  },
  {
    key: "agency_and_planning",
    title: "Agency and Planning",
    fields: [
      { key: "default_strategy", multiline: true },
      { key: "risk_style", multiline: true },
      { key: "fallback_style", multiline: true },
      { key: "planning_blind_spots", multiline: true },
    ],
  },
  {
    key: "prose_constraints",
    title: "Prose Constraints",
    fields: [
      { key: "prose_must_not_imply", chipArray: true },
      { key: "forbidden_inventions", chipArray: true },
      { key: "voice_do_not_do", chipArray: true },
    ],
  },
];

interface CastFormState {
  display_name: string;
  roles: string[];
  source_world_character?: string;
  identity: Record<string, string>;
  world_pressure_core: Record<string, string>;
  body_and_presence: Record<string, string>;
  voice: Record<string, unknown>;
  pressure_behavior: Record<string, string>;
  perception_and_embodiment: Record<string, string>;
  agency_and_planning: Record<string, string>;
  prose_constraints: Record<string, string[]>;
  relationship_behavior: Record<string, string>;
  nested: {
    identity: Record<string, string>;
    world_pressure_core: Record<string, string>;
    body_and_presence: Record<string, string>;
    voice: Record<string, unknown>;
    pressure_behavior: Record<string, string>;
    perception_and_embodiment: Record<string, string>;
    agency_and_planning: Record<string, string>;
    prose_constraints: Record<string, string[]>;
  };
}

export function RecordForm(props: RecordFormProps) {
  const { recordClass, initial, onSave, onCancel, saveError } = props;
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  // beat-templates uses its own dedicated form (BeatTemplateForm); the
  // generic RecordForm should never receive that class. The cast below
  // narrows the index type so the per-class map lookup is safe.
  const classFields =
    PER_CLASS_FIELDS[
      recordClass as Exclude<typeof recordClass, "beat-templates">
    ];

  const initialRefs = ensureRefs(initial?.refs);

  const [common, setCommon] = useState({
    id: typeof initial?.id === "string" ? initial.id : "",
    title: typeof initial?.title === "string" ? initial.title : "",
    active: initial?.active ?? true,
    importance:
      typeof initial?.importance === "string"
        ? initial.importance
        : "medium",
    tags: Array.isArray(initial?.tags) ? (initial.tags as string[]) : [],
    summary:
      typeof initial?.summary === "string" ? initial.summary : "",
    details:
      typeof initial?.details === "string" ? initial.details : "",
    refs: initialRefs,
    prompt_visibility:
      typeof initial?.prompt_visibility === "string"
        ? initial.prompt_visibility
        : "always",
    last_reviewed_after_segment:
      typeof initial?.last_reviewed_after_segment === "string"
        ? initial.last_reviewed_after_segment
        : (null as string | null),
    notes: typeof initial?.notes === "string" ? initial.notes : "",
  });

  const initialPerClass = useMemo<Record<string, unknown>>(() => {
    const seed: Record<string, unknown> = {};
    for (const fd of classFields) {
      const v = (initial as Record<string, unknown> | undefined)?.[fd.field];
      if (v !== undefined) seed[fd.field] = v;
      else seed[fd.field] = defaultForKind(fd.kind);
    }
    return seed;
  }, [classFields, initial]);

  const [perClass, setPerClass] = useState<Record<string, unknown>>(
    initialPerClass,
  );

  useEffect(() => {
    setPerClass(initialPerClass);
  }, [initialPerClass]);

  // Special-case axes for relationships (rendered separately, not as PER_CLASS_FIELDS)
  const initialAxes = useMemo(() => {
    const fromInitial =
      typeof initial === "object" && initial !== null
        ? ((initial as Record<string, unknown>).axes as
            | Record<string, string>
            | undefined)
        : undefined;
    const seed: Record<string, string> = {};
    for (const axis of RELATIONSHIP_AXIS_FIELDS) {
      seed[axis] = fromInitial?.[axis] ?? "medium";
    }
    return seed;
  }, [initial]);
  const [axes, setAxes] = useState<Record<string, string>>(initialAxes);
  useEffect(() => setAxes(initialAxes), [initialAxes]);

  // Cast nested state
  const initialCastNested = useMemo(() => {
    const blank = (keys: string[]) =>
      Object.fromEntries(keys.map((k) => [k, ""])) as Record<string, string>;
    const obj = (initial as Record<string, unknown> | undefined) ?? {};
    const get = (k: string) =>
      typeof obj[k] === "object" && obj[k] !== null
        ? (obj[k] as Record<string, unknown>)
        : {};
    const identity = {
      one_line: String(get("identity").one_line ?? ""),
      public_face: String(get("identity").public_face ?? ""),
      private_pressure: String(get("identity").private_pressure ?? ""),
    };
    const world_pressure_core = blank([
      "world_produced_wound",
      "active_appetite",
      "self_mythology",
      "irreconcilable_contradiction",
      "relational_charge",
      "moral_psychological_edge",
      "cannot_be_swapped_out_because",
    ]);
    for (const k of Object.keys(world_pressure_core)) {
      const v = (get("world_pressure_core") as Record<string, unknown>)[k];
      if (typeof v === "string") world_pressure_core[k] = v;
    }
    const body_and_presence = blank([
      "physicality",
      "body_limits",
      "habitual_gestures",
      "clothing_or_presentation",
      "social_presentation",
    ]);
    for (const k of Object.keys(body_and_presence)) {
      const v = (get("body_and_presence") as Record<string, unknown>)[k];
      if (typeof v === "string") body_and_presence[k] = v;
    }
    const voice: Record<string, unknown> = {
      baseline: "",
      under_pressure: "",
      intimacy: "",
      evasion: "",
      anger: "",
      lying: "",
      anti_generic_warnings: [] as string[],
    };
    for (const k of Object.keys(voice)) {
      const v = (get("voice") as Record<string, unknown>)[k];
      if (v !== undefined) voice[k] = v;
    }
    const pressure_behavior = blank([
      "cornered",
      "tempted",
      "humiliated",
      "protecting_attachment",
      "offered_power",
    ]);
    for (const k of Object.keys(pressure_behavior)) {
      const v = (get("pressure_behavior") as Record<string, unknown>)[k];
      if (typeof v === "string") pressure_behavior[k] = v;
    }
    const perception_and_embodiment = blank([
      "notices",
      "misses",
      "misreads",
      "sensory_bias",
    ]);
    for (const k of Object.keys(perception_and_embodiment)) {
      const v = (get("perception_and_embodiment") as Record<string, unknown>)[k];
      if (typeof v === "string") perception_and_embodiment[k] = v;
    }
    const agency_and_planning = blank([
      "default_strategy",
      "risk_style",
      "fallback_style",
      "planning_blind_spots",
    ]);
    for (const k of Object.keys(agency_and_planning)) {
      const v = (get("agency_and_planning") as Record<string, unknown>)[k];
      if (typeof v === "string") agency_and_planning[k] = v;
    }
    const prose_constraints: Record<string, string[]> = {
      prose_must_not_imply: [],
      forbidden_inventions: [],
      voice_do_not_do: [],
    };
    for (const k of Object.keys(prose_constraints)) {
      const v = (get("prose_constraints") as Record<string, unknown>)[k];
      if (Array.isArray(v)) prose_constraints[k] = v as string[];
    }
    return {
      identity,
      world_pressure_core,
      body_and_presence,
      voice,
      pressure_behavior,
      perception_and_embodiment,
      agency_and_planning,
      prose_constraints,
    };
  }, [initial]);
  const [castNested, setCastNested] = useState(initialCastNested);
  useEffect(() => setCastNested(initialCastNested), [initialCastNested]);

  const [relationshipBehavior, setRelationshipBehavior] = useState<Record<string, string>>(
    typeof initial === "object" &&
      initial !== null &&
      typeof (initial as Record<string, unknown>).relationship_behavior === "object"
      ? ((initial as Record<string, unknown>).relationship_behavior as Record<string, string>)
      : {},
  );

  const errorsByField = useMemo(() => {
    const out = new Map<string, string>();
    if (saveError && "errors" in saveError && saveError.errors) {
      for (const err of saveError.errors) {
        out.set(err.field, err.message);
      }
    }
    return out;
  }, [saveError]);

  function buildRecord(): ManualRecord {
    const base: Record<string, unknown> = {
      ...common,
      ...perClass,
    };
    if (recordClass === "relationships") {
      base.axes = axes;
    }
    if (recordClass === "cast") {
      base.identity = castNested.identity;
      base.world_pressure_core = castNested.world_pressure_core;
      base.body_and_presence = castNested.body_and_presence;
      base.voice = castNested.voice;
      base.pressure_behavior = castNested.pressure_behavior;
      base.perception_and_embodiment = castNested.perception_and_embodiment;
      base.agency_and_planning = castNested.agency_and_planning;
      base.prose_constraints = castNested.prose_constraints;
      base.relationship_behavior = relationshipBehavior;
    }
    return base as ManualRecord;
  }

  const draftRecord = useMemo(
    () => buildRecord(),
    [common, perClass, axes, castNested, relationshipBehavior, recordClass],
  );
  const unsavedChanges = useUnsavedChanges(draftRecord, {
    resetKeys: [recordClass, initial?.id ?? "new"],
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await onSave(draftRecord);
    if (result !== false) unsavedChanges.reset();
  }

  async function handleSaveAnyway() {
    const result = await onSave(draftRecord, { overrideBrokenRefs: true });
    if (result !== false) unsavedChanges.reset();
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="manual-record-form">
      <FieldRow label="Title" required error={errorsByField.get("title")}>
        <input
          type="text"
          value={common.title}
          onChange={(e) => setCommon({ ...common, title: e.target.value })}
          required
        />
      </FieldRow>
      <FieldRow label="Active" required={false}>
        <input
          type="checkbox"
          checked={common.active}
          onChange={(e) => setCommon({ ...common, active: e.target.checked })}
        />
      </FieldRow>
      <FieldRow label="Importance" required error={errorsByField.get("importance")}>
        <select
          aria-label="importance"
          value={common.importance}
          onChange={(e) =>
            setCommon({ ...common, importance: e.target.value as typeof common.importance })
          }
        >
          {IMPORTANCE_VALUES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label="Tags" required={false}>
        <ChipInput
          ariaLabel="tags"
          value={common.tags}
          onChange={(next) => setCommon({ ...common, tags: next })}
        />
      </FieldRow>
      <FieldRow label="Summary" required={false}>
        <textarea
          value={common.summary}
          onChange={(e) => setCommon({ ...common, summary: e.target.value })}
          rows={2}
        />
      </FieldRow>
      <FieldRow label="Details" required={false}>
        <textarea
          value={common.details}
          onChange={(e) => setCommon({ ...common, details: e.target.value })}
          rows={4}
        />
      </FieldRow>
      <FormGroup>
        <RecordPicker
          worldSlug={worldSlug}
          msSlug={msSlug}
          label="Refs (characters)"
          classes={["cast"]}
          mode="multi"
          value={common.refs.characters}
          onChange={(next) =>
            setCommon({ ...common, refs: { ...common.refs, characters: next } })
          }
        />
      </FormGroup>
      <FormGroup>
        <RecordPicker
          worldSlug={worldSlug}
          msSlug={msSlug}
          label="Refs (locations)"
          classes={["locations"]}
          mode="multi"
          value={common.refs.locations}
          onChange={(next) =>
            setCommon({ ...common, refs: { ...common.refs, locations: next } })
          }
        />
      </FormGroup>
      <FormGroup>
        <RecordPicker
          worldSlug={worldSlug}
          msSlug={msSlug}
          label="Refs (related records)"
          classes={MANUAL_RECORD_CLASSES}
          mode="multi"
          value={common.refs.related_records}
          onChange={(next) =>
            setCommon({
              ...common,
              refs: { ...common.refs, related_records: next },
            })
          }
        />
      </FormGroup>
      <FieldRow label="Prompt visibility" required>
        <select
          aria-label="prompt_visibility"
          value={common.prompt_visibility}
          onChange={(e) =>
            setCommon({
              ...common,
              prompt_visibility: e.target.value as typeof common.prompt_visibility,
            })
          }
        >
          {PROMPT_VISIBILITY_VALUES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label="Last reviewed after segment (SEG-* or empty)" required={false}>
        <input
          type="text"
          value={common.last_reviewed_after_segment ?? ""}
          onChange={(e) =>
            setCommon({
              ...common,
              last_reviewed_after_segment:
                e.target.value.trim() === "" ? null : e.target.value,
            })
          }
        />
      </FieldRow>
      <FieldRow label="Notes" required={false}>
        <textarea
          value={common.notes}
          onChange={(e) => setCommon({ ...common, notes: e.target.value })}
          rows={3}
        />
      </FieldRow>

      {classFields.map((fd) => (
        <FieldRow
          key={fd.field}
          label={fd.label}
          required={fd.required}
          error={errorsByField.get(fd.field)}
        >
          {renderFieldControl(
            fd.field,
            fd.kind,
            perClass[fd.field],
            (v) => setPerClass({ ...perClass, [fd.field]: v }),
          )}
        </FieldRow>
      ))}

      {recordClass === "relationships" ? (
        <fieldset>
          <legend>Axes</legend>
          {RELATIONSHIP_AXIS_FIELDS.map((axis) => (
            <FieldRow key={axis} label={axis} required>
              <select
                aria-label={`axes.${axis}`}
                value={axes[axis] ?? "medium"}
                onChange={(e) =>
                  setAxes({ ...axes, [axis]: e.target.value })
                }
              >
                {RELATIONSHIP_AXIS_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </FieldRow>
          ))}
        </fieldset>
      ) : null}

      {recordClass === "cast" ? (
        <>
          {CAST_NESTED_SECTIONS.map((section) => (
            <details key={section.key} open>
              <summary>{section.title}</summary>
              {section.fields.map((field) => {
                if (field.chipArray) {
                  const value =
                    (castNested as unknown as Record<string, Record<string, unknown>>)[
                      section.key
                    ]?.[field.key];
                  return (
                    <FieldRow key={field.key} label={field.key} required={false}>
                      <ChipInput
                        ariaLabel={`${String(section.key)}.${field.key}`}
                        value={Array.isArray(value) ? (value as string[]) : []}
                        onChange={(next) => {
                          const nested = {
                            ...(castNested[section.key] as Record<string, unknown>),
                            [field.key]: next,
                          };
                          setCastNested({ ...castNested, [section.key]: nested });
                        }}
                      />
                    </FieldRow>
                  );
                }
                const value =
                  (castNested as unknown as Record<string, Record<string, unknown>>)[
                    section.key
                  ]?.[field.key];
                return (
                  <FieldRow key={field.key} label={field.key} required={false}>
                    <textarea
                      aria-label={`${String(section.key)}.${field.key}`}
                      value={typeof value === "string" ? value : ""}
                      rows={field.multiline ? 3 : 1}
                      onChange={(e) => {
                        const nested = {
                          ...(castNested[section.key] as Record<string, unknown>),
                          [field.key]: e.target.value,
                        };
                        setCastNested({ ...castNested, [section.key]: nested });
                      }}
                    />
                  </FieldRow>
                );
              })}
            </details>
          ))}
          <details open>
            <summary>Relationship Behavior (map mchar-* → description)</summary>
            <RelationshipBehaviorEditor
              value={relationshipBehavior}
              onChange={setRelationshipBehavior}
            />
          </details>
        </>
      ) : null}

      {saveError && saveError.error === "broken_refs" ? (
        <section role="alert" style={{ background: "#fee", padding: 8 }}>
          <p>
            This record references missing IDs:{" "}
            {saveError.violations
              .map((v) => `${v.field}=${v.missingId}`)
              .join(", ")}
          </p>
          <button type="button" onClick={handleSaveAnyway}>
            Save anyway
          </button>
        </section>
      ) : null}
      {saveError && saveError.error === "validation_failed" ? (
        <section role="alert" style={{ background: "#fee", padding: 8 }}>
          <p>Validation failed; fix the highlighted fields above.</p>
        </section>
      ) : null}
      {saveError && saveError.error === "bad_request" ? (
        <section role="alert" style={{ background: "#fee", padding: 8 }}>
          <p>{saveError.message}</p>
        </section>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function renderFieldControl(
  field: string,
  kind: {
    kind: string;
    values?: readonly string[];
    class?: string;
  },
  value: unknown,
  onChange: (next: unknown) => void,
): React.ReactNode {
  switch (kind.kind) {
    case "string":
      return (
        <input
          aria-label={field}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "readonlyString":
      return (
        <input
          aria-label={field}
          type="text"
          readOnly
          value={typeof value === "string" ? value : ""}
          style={{ background: "#f5f5f5" }}
        />
      );
    case "boolean":
      return (
        <input
          aria-label={field}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "number":
      return (
        <input
          aria-label={field}
          type="number"
          value={typeof value === "number" ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "stringOrNumber":
      return (
        <input
          aria-label={field}
          type="text"
          value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
          onChange={(e) => {
            const raw = e.target.value;
            const n = Number(raw);
            onChange(raw === "" ? "" : Number.isFinite(n) && raw.trim() !== "" ? n : raw);
          }}
        />
      );
    case "enum":
      return (
        <select
          aria-label={field}
          value={typeof value === "string" ? value : (kind.values?.[0] ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {(kind.values ?? []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    case "enumArray":
      return (
        <fieldset>
          {(kind.values ?? []).map((v) => {
            const checked = Array.isArray(value) && (value as string[]).includes(v);
            return (
              <label key={v} style={{ display: "inline-block", marginRight: 8 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    onChange(
                      e.target.checked
                        ? [...current, v]
                        : current.filter((x) => x !== v),
                    );
                  }}
                />{" "}
                {v}
              </label>
            );
          })}
        </fieldset>
      );
    case "stringArray":
      return (
        <ChipInput
          ariaLabel={field}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange as (next: string[]) => void}
        />
      );
    case "pair": {
      const v = Array.isArray(value) ? (value as string[]) : ["", ""];
      return (
        <div style={{ display: "flex", gap: 4 }}>
          <input
            aria-label={`${field}[0]`}
            type="text"
            value={v[0] ?? ""}
            onChange={(e) => onChange([e.target.value, v[1] ?? ""])}
          />
          <input
            aria-label={`${field}[1]`}
            type="text"
            value={v[1] ?? ""}
            onChange={(e) => onChange([v[0] ?? "", e.target.value])}
          />
        </div>
      );
    }
    case "nullableString":
      return (
        <input
          aria-label={field}
          type="text"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value.trim() === "" ? null : e.target.value)
          }
        />
      );
    default:
      return null;
  }
}

function RelationshipBehaviorEditor(props: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("");
  return (
    <div>
      {Object.entries(props.value).map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          <span style={{ minWidth: 100 }}>{k}</span>
          <input
            aria-label={`relationship_behavior.${k}`}
            type="text"
            value={v}
            onChange={(e) =>
              props.onChange({ ...props.value, [k]: e.target.value })
            }
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => {
              const next = { ...props.value };
              delete next[k];
              props.onChange(next);
            }}
          >
            remove
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 4 }}>
        <input
          aria-label="new-relationship-behavior-key"
          type="text"
          placeholder="mchar-1 or authority_figures"
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
        />
        <input
          aria-label="new-relationship-behavior-value"
          type="text"
          placeholder="description"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (draftKey.trim() === "") return;
            props.onChange({ ...props.value, [draftKey.trim()]: draftValue });
            setDraftKey("");
            setDraftValue("");
          }}
        >
          add
        </button>
      </div>
    </div>
  );
}
