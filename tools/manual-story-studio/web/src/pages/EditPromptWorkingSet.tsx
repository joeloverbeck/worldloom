import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchPromptWorkingSet,
  savePromptWorkingSet,
} from "../api/prompt-working-set.js";
import { RefList } from "../components/RefList.js";
import { RecordPicker } from "../components/RecordPicker.js";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges.js";
import {
  PICKABLE_RECORD_CLASSES,
  MANUAL_RECORD_CLASS_PREFIXES,
  type PromptWorkingSet,
  type ManualRecordClass,
  type RecordRefs,
  type ValidationError,
} from "../types/manual-story.js";

const EMPTY_CONTEXT: PromptWorkingSet = {
  current_location: null,
  current_cast: [],
  pov_holder: null,
  active_pressure_clocks: [],
  active_secrets_questions: [],
  pinned_records: [],
  excluded_records: [],
  must_not_reveal: [],
  handoff_summary: "",
  last_accepted_segment: null,
};

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "request failed";
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function allManualPrefixes(): string[] {
  return Object.values(MANUAL_RECORD_CLASS_PREFIXES).map(
    (prefix) => `${prefix}-`,
  );
}

function allowedPrefixes(classes: ManualRecordClass[]): string[] {
  return classes.map((cls) => `${MANUAL_RECORD_CLASS_PREFIXES[cls]}-`);
}

function invalidIds(ids: string[], prefixes: string[]): string[] {
  return ids.filter((id) => !prefixes.some((prefix) => id.startsWith(prefix)));
}

function fieldError(
  field: string,
  serverErrors: Map<string, string>,
  clientErrors: Map<string, string>,
): string | undefined {
  return clientErrors.get(field) ?? serverErrors.get(field);
}

function errorsByField(findings: ValidationError[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const finding of findings) {
    out.set(finding.field, finding.message);
  }
  return out;
}

function FieldRow(props: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", margin: "10px 0" }}>
      <span style={{ display: "block", fontWeight: 600 }}>
        {props.label}
        {props.required ? " *" : ""}
      </span>
      {props.children}
      {props.hint ? (
        <span style={{ display: "block", color: "#666", fontSize: 12 }}>
          {props.hint}
        </span>
      ) : null}
      {props.error ? (
        <span
          role="alert"
          style={{ display: "block", color: "#b00", fontSize: 12 }}
        >
          {props.error}
        </span>
      ) : null}
    </label>
  );
}

function PickerRow(props: {
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ margin: "10px 0" }}>
      {props.children}
      {props.error ? (
        <span
          role="alert"
          style={{ display: "block", color: "#b00", fontSize: 12 }}
        >
          {props.error}
        </span>
      ) : null}
    </div>
  );
}

function firstId(ids: string[]): string | null {
  return ids[0] ?? null;
}

function pinnedRefs(ids: string[]): RecordRefs {
  return { characters: [], locations: [], related_records: ids };
}

export function EditPromptWorkingSet() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const navigate = useNavigate();

  const [ctx, setCtx] = useState<PromptWorkingSet>(EMPTY_CONTEXT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveFindings, setSaveFindings] = useState<ValidationError[]>([]);

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveFindings([]);
    fetchPromptWorkingSet(worldSlug, msSlug)
      .then((loaded) => {
        if (cancelled) return;
        setCtx(loaded ? { ...EMPTY_CONTEXT, ...loaded } : EMPTY_CONTEXT);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(loadErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug]);

  const clientErrors = useMemo(() => {
    const errors = new Map<string, string>();
    const castInvalid = invalidIds(ctx.current_cast, allowedPrefixes(["cast"]));
    if (castInvalid.length > 0) {
      errors.set("current_cast", `Invalid cast IDs: ${castInvalid.join(", ")}`);
    }
    const clockInvalid = invalidIds(
      ctx.active_pressure_clocks,
      allowedPrefixes(["clocks"]),
    );
    if (clockInvalid.length > 0) {
      errors.set(
        "active_pressure_clocks",
        `Invalid clock IDs: ${clockInvalid.join(", ")}`,
      );
    }
    const secretQuestionInvalid = invalidIds(
      ctx.active_secrets_questions,
      allowedPrefixes(["secrets", "questions"]),
    );
    if (secretQuestionInvalid.length > 0) {
      errors.set(
        "active_secrets_questions",
        `Invalid secret/question IDs: ${secretQuestionInvalid.join(", ")}`,
      );
    }
    const pinnedInvalid = invalidIds(ctx.pinned_records, allManualPrefixes());
    if (pinnedInvalid.length > 0) {
      errors.set(
        "pinned_records",
        `Invalid pinned IDs: ${pinnedInvalid.join(", ")}`,
      );
    }
    const excludedInvalid = invalidIds(ctx.excluded_records ?? [], allManualPrefixes());
    if (excludedInvalid.length > 0) {
      errors.set(
        "excluded_records",
        `Invalid excluded IDs: ${excludedInvalid.join(", ")}`,
      );
    }
    const mustNotRevealInvalid = invalidIds(
      ctx.must_not_reveal,
      allowedPrefixes(["secrets"]),
    );
    if (mustNotRevealInvalid.length > 0) {
      errors.set(
        "must_not_reveal",
        `Invalid must-not-reveal IDs: ${mustNotRevealInvalid.join(", ")}`,
      );
    }
    if (ctx.current_location && !ctx.current_location.startsWith("mloc-")) {
      errors.set("current_location", "Current location must use the mloc- prefix.");
    }
    if (
      ctx.last_accepted_segment &&
      !ctx.last_accepted_segment.startsWith("SEG-")
    ) {
      errors.set(
        "last_accepted_segment",
        "Last accepted segment must use the SEG- prefix.",
      );
    }
    return errors;
  }, [ctx]);

  const serverErrors = useMemo(() => errorsByField(saveFindings), [saveFindings]);
  const canSave =
    clientErrors.size === 0 && !saving && !loading && loadError === null;
  const unsavedChanges = useUnsavedChanges(ctx, {
    enabled: !loading && loadError === null,
    resetKeys: [worldSlug, msSlug, loading ? "loading" : "loaded"],
  });

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }
  const world = worldSlug;
  const story = msSlug;
  const routeBase = `/worlds/${world}/manual-stories/${story}`;

  function update(next: Partial<PromptWorkingSet>): void {
    setCtx((current) => ({ ...current, ...next }));
    setSaveError(null);
    setSaveFindings([]);
  }

  function openRef(recordClass: ManualRecordClass, id: string): void {
    navigate(`${routeBase}/records`, {
      state: { recordClass, recordId: id },
    });
  }

  async function onSave(): Promise<void> {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    setSaveFindings([]);
    try {
      const result = await savePromptWorkingSet(world, story, ctx);
      if (result.ok) {
        unsavedChanges.reset();
        navigate(`${routeBase}/dashboard`);
      } else {
        setSaveFindings(result.findings);
      }
    } catch (error: unknown) {
      setSaveError(loadErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="edit-prompt-working-set-heading"
      style={{ display: "grid", gap: 12 }}
    >
      <h2 id="edit-prompt-working-set-heading">Edit Prompt Working Set</h2>

      {loadError ? (
        <p role="alert">
          Failed to load prompt working set: {loadError}
        </p>
      ) : null}
      {loading ? <p>Loading prompt working set...</p> : null}

      <FieldRow
        label="Current handoff summary"
        error={fieldError("handoff_summary", serverErrors, clientErrors)}
      >
        <textarea
          rows={6}
          value={ctx.handoff_summary}
          onChange={(event) => update({ handoff_summary: event.target.value })}
          style={{ width: "100%", fontFamily: "inherit" }}
        />
      </FieldRow>

      <PickerRow
        error={fieldError("current_location", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="Current location"
          classes={["locations"]}
          mode="single"
          value={ctx.current_location ? [ctx.current_location] : []}
          onChange={(current_location) =>
            update({ current_location: firstId(current_location) })
          }
        />
      </PickerRow>

      <PickerRow
        error={fieldError("current_cast", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="Current cast"
          classes={["cast"]}
          mode="multi"
          value={ctx.current_cast}
          onChange={(current_cast) => update({ current_cast })}
        />
      </PickerRow>

      <PickerRow
        error={fieldError("pov_holder", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="POV holder"
          classes={["cast"]}
          mode="single"
          value={ctx.pov_holder ? [ctx.pov_holder] : []}
          seed={ctx.current_cast}
          onChange={(pov_holder) => update({ pov_holder: firstId(pov_holder) })}
        />
      </PickerRow>

      <PickerRow
        error={fieldError("active_pressure_clocks", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="Active pressure clocks"
          classes={["clocks"]}
          mode="multi"
          value={ctx.active_pressure_clocks}
          onChange={(active_pressure_clocks) => update({ active_pressure_clocks })}
        />
      </PickerRow>

      <PickerRow
        error={fieldError("active_secrets_questions", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="Active secrets and questions"
          classes={["secrets", "questions"]}
          mode="multi"
          value={ctx.active_secrets_questions}
          onChange={(active_secrets_questions) =>
            update({ active_secrets_questions })
          }
        />
      </PickerRow>

      <PickerRow
        error={fieldError("pinned_records", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="Pinned records"
          classes={PICKABLE_RECORD_CLASSES}
          mode="multi"
          value={ctx.pinned_records}
          onChange={(pinned_records) => update({ pinned_records })}
        />
      </PickerRow>

      <section aria-label="pinned-record-preview">
        <h3>Pinned record preview</h3>
        <RefList refs={pinnedRefs(ctx.pinned_records)} onRefClick={openRef} />
      </section>

      <PickerRow
        error={fieldError("excluded_records", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="Excluded records"
          classes={PICKABLE_RECORD_CLASSES}
          mode="multi"
          value={ctx.excluded_records ?? []}
          onChange={(excluded_records) => update({ excluded_records })}
        />
      </PickerRow>

      <PickerRow
        error={fieldError("must_not_reveal", serverErrors, clientErrors)}
      >
        <RecordPicker
          worldSlug={world}
          msSlug={story}
          label="Must not reveal"
          classes={["secrets"]}
          mode="multi"
          value={ctx.must_not_reveal}
          onChange={(must_not_reveal) => update({ must_not_reveal })}
        />
      </PickerRow>

      <FieldRow
        label="Last accepted segment"
        error={fieldError("last_accepted_segment", serverErrors, clientErrors)}
        hint="SEG-* or empty"
      >
        <input
          type="text"
          value={ctx.last_accepted_segment ?? ""}
          onChange={(event) =>
            update({ last_accepted_segment: nullableText(event.target.value) })
          }
        />
      </FieldRow>

      {saveFindings.length > 0 ? (
        <section role="alert" style={{ background: "#fee", padding: 8 }}>
          <p>Prompt working set validation failed.</p>
          <ul>
            {saveFindings.map((finding, index) => (
              <li key={`${finding.field}-${index}`}>
                {finding.field}: {finding.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {saveError ? (
        <p role="alert">Failed to save prompt working set: {saveError}</p>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onSave} disabled={!canSave}>
          {saving ? "Saving..." : "Save Prompt Working Set"}
        </button>
        <button
          type="button"
          onClick={() => navigate(`${routeBase}/dashboard`)}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
