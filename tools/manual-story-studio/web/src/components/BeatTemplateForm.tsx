import { useState } from "react";

import { useUnsavedChanges } from "../hooks/useUnsavedChanges.js";
import {
  BEAT_TEMPLATE_BEAT_FUNCTIONS,
  BEAT_TEMPLATE_MOVE_FAMILIES,
  BEAT_TEMPLATE_PRESSURE_TYPES,
  BEAT_TEMPLATE_RELATIONSHIP_AXES,
  BEAT_TEMPLATE_TURN_TYPES,
  BEAT_TEMPLATE_TONE_FITS,
  MANUAL_RECORD_CLASSES,
  PICKABLE_RECORD_CLASSES,
  type BeatTemplate,
  type BeatTemplateBeat,
  type BeatTemplateBeatFunction,
  type BeatTemplateMoveFamily,
  type BeatTemplatePressureType,
  type BeatTemplateRelationshipAxis,
  type BeatTemplateRoleSlot,
  type BeatTemplateToneFit,
  type BeatTemplateTurnType,
  type ManualRecordClass,
  type ManualStoryContentIntensity,
  type ManualStoryRole,
  type ValidationError,
} from "../types/manual-story.js";

const ROLE_VALUES: ManualStoryRole[] = [
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
];

const CONTENT_INTENSITIES: ManualStoryContentIntensity[] = [
  "general",
  "mature",
  "explicit",
];

const STATE_REVIEW_RECORD_CLASSES: ManualRecordClass[] =
  PICKABLE_RECORD_CLASSES;

function defaultTemplate(): Omit<BeatTemplate, "id"> {
  return {
    title: "",
    active: true,
    pressure_type: "discovery",
    turn_type: "discovery_turn",
    preconditions_text: "",
    do_not_resolve: [],
    expected_state_review: [],
    stop_after: "",
    anti_patterns: [],
    classification: {
      move_family: "observation",
      tags: [],
      intensity: "general",
      tone_fit: [],
    },
    role_slots: {},
    requires: {
      record_classes_any: [],
      record_tags_any: [],
      relationship_axes_any: [],
      location_tags_any: [],
    },
    excludes: { record_tags_any: [], forbidden_if_secret_tags: [] },
    beat_guidance: [{ function: "setup", instruction: "" }],
    forbidden_inventions: [],
    author_notes: "",
  };
}

export interface BeatTemplateFormProps {
  initial?: BeatTemplate;
  onSave: (
    template: Omit<BeatTemplate, "id"> | BeatTemplate,
  ) => Promise<boolean | void>;
  onCancel: () => void;
  saveErrors?: ValidationError[];
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function joinCsv(values: string[]): string {
  return values.join(", ");
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function BeatTemplateForm(props: BeatTemplateFormProps) {
  const { initial, onSave, onCancel, saveErrors } = props;
  const [draft, setDraft] = useState<Omit<BeatTemplate, "id">>(
    initial ? { ...initial } : defaultTemplate(),
  );
  const unsavedChanges = useUnsavedChanges(draft, {
    resetKeys: [initial?.id ?? "new"],
  });

  function setField<K extends keyof Omit<BeatTemplate, "id">>(
    key: K,
    value: Omit<BeatTemplate, "id">[K],
  ): void {
    setDraft({ ...draft, [key]: value });
  }

  function addRoleSlot(): void {
    const next = { ...draft.role_slots };
    const baseName = `slot_${Object.keys(next).length + 1}`;
    next[baseName] = { compatible_roles: [] };
    setDraft({ ...draft, role_slots: next });
  }

  function renameRoleSlot(oldName: string, newName: string): void {
    if (newName.trim().length === 0 || newName === oldName) return;
    const next: Record<string, BeatTemplateRoleSlot> = {};
    for (const [k, v] of Object.entries(draft.role_slots)) {
      if (k === oldName) next[newName] = v;
      else next[k] = v;
    }
    setDraft({ ...draft, role_slots: next });
  }

  function removeRoleSlot(name: string): void {
    const next = { ...draft.role_slots };
    delete next[name];
    setDraft({ ...draft, role_slots: next });
  }

  function toggleRoleInSlot(
    slotName: string,
    role: ManualStoryRole,
    checked: boolean,
  ): void {
    const slot = draft.role_slots[slotName];
    if (!slot) return;
    const next: ManualStoryRole[] = checked
      ? [...slot.compatible_roles, role]
      : slot.compatible_roles.filter((r) => r !== role);
    setDraft({
      ...draft,
      role_slots: {
        ...draft.role_slots,
        [slotName]: { compatible_roles: next },
      },
    });
  }

  function setBeatField<K extends keyof BeatTemplateBeat>(
    index: number,
    field: K,
    value: BeatTemplateBeat[K],
  ): void {
    const beats = draft.beat_guidance.map((b, i) =>
      i === index ? { ...b, [field]: value } : b,
    );
    setDraft({ ...draft, beat_guidance: beats });
  }

  function addBeat(): void {
    if (draft.beat_guidance.length >= 5) return;
    setDraft({
      ...draft,
      beat_guidance: [
        ...draft.beat_guidance,
        { function: "setup", instruction: "" },
      ],
    });
  }

  function removeBeat(index: number): void {
    if (draft.beat_guidance.length <= 1) return;
    setDraft({
      ...draft,
      beat_guidance: draft.beat_guidance.filter((_, i) => i !== index),
    });
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    let result: boolean | void;
    if (initial) {
      result = await onSave({ ...draft, id: initial.id });
    } else {
      result = await onSave(draft);
    }
    if (result !== false) unsavedChanges.reset();
  }

  return (
    <form onSubmit={handleSubmit} aria-label="beat-template-form">
      <fieldset>
        <legend>Identity</legend>
        <label>
          Title{" "}
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setField("title", e.target.value)}
            required
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setField("active", e.target.checked)}
          />
          {" "}Active
        </label>
      </fieldset>

      <fieldset>
        <legend>Classification</legend>
        <label>
          Pressure type{" "}
          <select
            value={draft.pressure_type}
            onChange={(e) =>
              setField("pressure_type", e.target.value as BeatTemplatePressureType)
            }
          >
            {BEAT_TEMPLATE_PRESSURE_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </label>
        <label>
          Turn type{" "}
          <select
            value={draft.turn_type}
            onChange={(e) =>
              setField("turn_type", e.target.value as BeatTemplateTurnType)
            }
          >
            {BEAT_TEMPLATE_TURN_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>
        </label>
        <label>
          Move family{" "}
          <select
            value={draft.classification.move_family}
            onChange={(e) =>
              setField("classification", {
                ...draft.classification,
                move_family: e.target.value as BeatTemplateMoveFamily,
              })
            }
          >
            {BEAT_TEMPLATE_MOVE_FAMILIES.map((mf) => (
              <option key={mf} value={mf}>
                {mf}
              </option>
            ))}
          </select>
        </label>
        <label>
          Intensity{" "}
          <select
            value={draft.classification.intensity}
            onChange={(e) =>
              setField("classification", {
                ...draft.classification,
                intensity: e.target.value as ManualStoryContentIntensity,
              })
            }
          >
            {CONTENT_INTENSITIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tags (comma-separated){" "}
          <input
            type="text"
            value={joinCsv(draft.classification.tags)}
            onChange={(e) =>
              setField("classification", {
                ...draft.classification,
                tags: splitCsv(e.target.value),
              })
            }
          />
        </label>
        <fieldset>
          <legend>Tone fit</legend>
          {BEAT_TEMPLATE_TONE_FITS.map((tf) => (
            <label key={tf} style={{ marginRight: 8 }}>
              <input
                type="checkbox"
                checked={draft.classification.tone_fit.includes(tf)}
                onChange={(e) =>
                  setField("classification", {
                    ...draft.classification,
                    tone_fit: e.target.checked
                      ? [...draft.classification.tone_fit, tf]
                      : draft.classification.tone_fit.filter(
                          (t: BeatTemplateToneFit) => t !== tf,
                        ),
                  })
                }
              />{" "}
              {tf}
            </label>
          ))}
        </fieldset>
      </fieldset>

      <fieldset>
        <legend>Template constraints</legend>
        <label>
          Preconditions{" "}
          <textarea
            value={draft.preconditions_text}
            onChange={(e) => setField("preconditions_text", e.target.value)}
            rows={3}
            cols={60}
          />
        </label>
        <label>
          Stop after{" "}
          <textarea
            value={draft.stop_after}
            onChange={(e) => setField("stop_after", e.target.value)}
            rows={3}
            cols={60}
          />
        </label>
        <label>
          Do not resolve (one per line){" "}
          <textarea
            value={draft.do_not_resolve.join("\n")}
            onChange={(e) => setField("do_not_resolve", splitLines(e.target.value))}
            rows={4}
            cols={60}
          />
        </label>
        <label>
          Anti-patterns (one per line){" "}
          <textarea
            value={draft.anti_patterns.join("\n")}
            onChange={(e) => setField("anti_patterns", splitLines(e.target.value))}
            rows={4}
            cols={60}
          />
        </label>
        <fieldset>
          <legend>Expected state review</legend>
          {STATE_REVIEW_RECORD_CLASSES.map((cls) => (
            <label key={cls} style={{ marginRight: 8 }}>
              <input
                type="checkbox"
                checked={draft.expected_state_review.includes(cls)}
                onChange={(e) =>
                  setField(
                    "expected_state_review",
                    e.target.checked
                      ? [...draft.expected_state_review, cls]
                      : draft.expected_state_review.filter(
                          (x: ManualRecordClass) => x !== cls,
                        ),
                  )
                }
              />{" "}
              {cls}
            </label>
          ))}
        </fieldset>
      </fieldset>

      <fieldset>
        <legend>Role slots</legend>
        {Object.entries(draft.role_slots).map(([slotName, slot]) => (
          <fieldset
            key={slotName}
            aria-label={`role-slot-${slotName}`}
            style={{ marginBottom: 8 }}
          >
            <legend>
              <input
                type="text"
                value={slotName}
                onChange={(e) => renameRoleSlot(slotName, e.target.value)}
              />{" "}
              <button type="button" onClick={() => removeRoleSlot(slotName)}>
                Remove slot
              </button>
            </legend>
            {ROLE_VALUES.map((role) => (
              <label key={role} style={{ marginRight: 4 }}>
                <input
                  type="checkbox"
                  checked={slot.compatible_roles.includes(role)}
                  onChange={(e) =>
                    toggleRoleInSlot(slotName, role, e.target.checked)
                  }
                />{" "}
                {role}
              </label>
            ))}
          </fieldset>
        ))}
        <button type="button" onClick={addRoleSlot}>
          + Add role slot
        </button>
      </fieldset>

      <fieldset>
        <legend>Requires</legend>
        <label>
          Record classes (comma-separated){" "}
          <input
            type="text"
            value={joinCsv(draft.requires.record_classes_any)}
            onChange={(e) =>
              setField("requires", {
                ...draft.requires,
                record_classes_any: splitCsv(e.target.value).filter((c) =>
                  (MANUAL_RECORD_CLASSES as readonly string[]).includes(c),
                ),
              })
            }
          />
        </label>
        <label>
          Record tags (comma-separated){" "}
          <input
            type="text"
            value={joinCsv(draft.requires.record_tags_any)}
            onChange={(e) =>
              setField("requires", {
                ...draft.requires,
                record_tags_any: splitCsv(e.target.value),
              })
            }
          />
        </label>
        <fieldset>
          <legend>Relationship axes</legend>
          {BEAT_TEMPLATE_RELATIONSHIP_AXES.map((a) => (
            <label key={a} style={{ marginRight: 8 }}>
              <input
                type="checkbox"
                checked={draft.requires.relationship_axes_any.includes(a)}
                onChange={(e) =>
                  setField("requires", {
                    ...draft.requires,
                    relationship_axes_any: e.target.checked
                      ? [...draft.requires.relationship_axes_any, a]
                      : draft.requires.relationship_axes_any.filter(
                          (x: BeatTemplateRelationshipAxis) => x !== a,
                        ),
                  })
                }
              />{" "}
              {a}
            </label>
          ))}
        </fieldset>
        <label>
          Location tags (comma-separated){" "}
          <input
            type="text"
            value={joinCsv(draft.requires.location_tags_any)}
            onChange={(e) =>
              setField("requires", {
                ...draft.requires,
                location_tags_any: splitCsv(e.target.value),
              })
            }
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Excludes</legend>
        <label>
          Record tags (comma-separated){" "}
          <input
            type="text"
            value={joinCsv(draft.excludes.record_tags_any)}
            onChange={(e) =>
              setField("excludes", {
                ...draft.excludes,
                record_tags_any: splitCsv(e.target.value),
              })
            }
          />
        </label>
        <label>
          Forbidden if secret tags (comma-separated){" "}
          <input
            type="text"
            value={joinCsv(draft.excludes.forbidden_if_secret_tags)}
            onChange={(e) =>
              setField("excludes", {
                ...draft.excludes,
                forbidden_if_secret_tags: splitCsv(e.target.value),
              })
            }
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Beat guidance (1-5 entries)</legend>
        {draft.beat_guidance.map((beat, i) => (
          <fieldset key={i} aria-label={`beat-${i}`}>
            <legend>
              Beat {i + 1}{" "}
              {draft.beat_guidance.length > 1 ? (
                <button type="button" onClick={() => removeBeat(i)}>
                  Remove
                </button>
              ) : null}
            </legend>
            <label>
              Function{" "}
              <select
                value={beat.function}
                onChange={(e) =>
                  setBeatField(
                    i,
                    "function",
                    e.target.value as BeatTemplateBeatFunction,
                  )
                }
              >
                {BEAT_TEMPLATE_BEAT_FUNCTIONS.map((bf) => (
                  <option key={bf} value={bf}>
                    {bf}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Instruction{" "}
              <textarea
                value={beat.instruction}
                onChange={(e) =>
                  setBeatField(i, "instruction", e.target.value)
                }
                rows={2}
                cols={60}
              />
            </label>
          </fieldset>
        ))}
        <button
          type="button"
          onClick={addBeat}
          disabled={draft.beat_guidance.length >= 5}
        >
          + Add beat (max 5)
        </button>
      </fieldset>

      <fieldset>
        <legend>Forbidden inventions (one per line)</legend>
        <textarea
          value={draft.forbidden_inventions.join("\n")}
          onChange={(e) =>
            setField("forbidden_inventions", splitLines(e.target.value))
          }
          rows={4}
          cols={60}
        />
      </fieldset>

      <fieldset>
        <legend>Author notes</legend>
        <textarea
          value={draft.author_notes}
          onChange={(e) => setField("author_notes", e.target.value)}
          rows={3}
          cols={60}
        />
      </fieldset>

      {saveErrors && saveErrors.length > 0 ? (
        <section role="alert" style={{ background: "#fee", padding: 8 }}>
          <strong>Validation failed:</strong>
          <ul>
            {saveErrors.map((v, i) => (
              <li key={i}>
                <code>{v.field}</code>: {v.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <button type="submit">Save</button>{" "}
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
