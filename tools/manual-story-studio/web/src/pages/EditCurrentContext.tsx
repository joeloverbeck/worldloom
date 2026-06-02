import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchCurrentContext,
  saveCurrentContext,
} from "../api/current-context.js";
import { RefList } from "../components/RefList.js";
import {
  MANUAL_RECORD_CLASS_PREFIXES,
  type CurrentContext,
  type ManualRecordClass,
  type RecordRefs,
  type ValidationError,
} from "../types/manual-story.js";

const EMPTY_CONTEXT: CurrentContext = {
  current_location: null,
  current_cast: [],
  pov_holder: null,
  active_pressure_clocks: [],
  active_secrets_questions: [],
  pinned_records: [],
  must_not_reveal: [],
  current_handoff_summary: "",
  last_accepted_segment: null,
  last_reviewed_after_segment: null,
};

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "request failed";
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseIdList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function listText(ids: string[]): string {
  return ids.join("\n");
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

function IdTextArea(props: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  allowedPrefixes: string[];
  error?: string;
  rows?: number;
}) {
  return (
    <FieldRow
      label={props.label}
      error={props.error}
      hint={`Comma- or newline-separated IDs. Allowed prefixes: ${props.allowedPrefixes.join(", ")}`}
    >
      <textarea
        rows={props.rows ?? 3}
        value={listText(props.value)}
        onChange={(event) => props.onChange(parseIdList(event.target.value))}
        style={{ width: "100%", fontFamily: "inherit" }}
      />
    </FieldRow>
  );
}

function pinnedRefs(ids: string[]): RecordRefs {
  return { characters: [], locations: [], related_records: ids };
}

export function EditCurrentContext() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const navigate = useNavigate();

  const [ctx, setCtx] = useState<CurrentContext>(EMPTY_CONTEXT);
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
    fetchCurrentContext(worldSlug, msSlug)
      .then((loaded) => {
        if (cancelled) return;
        setCtx(loaded ?? EMPTY_CONTEXT);
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
    if (
      ctx.last_reviewed_after_segment &&
      !ctx.last_reviewed_after_segment.startsWith("SEG-")
    ) {
      errors.set(
        "last_reviewed_after_segment",
        "Last reviewed after segment must use the SEG- prefix.",
      );
    }
    return errors;
  }, [ctx]);

  const serverErrors = useMemo(() => errorsByField(saveFindings), [saveFindings]);
  const canSave =
    clientErrors.size === 0 && !saving && !loading && loadError === null;

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }
  const world = worldSlug;
  const story = msSlug;
  const routeBase = `/worlds/${world}/manual-stories/${story}`;

  function update(next: Partial<CurrentContext>): void {
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
      const result = await saveCurrentContext(world, story, ctx);
      if (result.ok) {
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
      aria-labelledby="edit-current-context-heading"
      style={{ display: "grid", gap: 12 }}
    >
      <h2 id="edit-current-context-heading">Edit Current Context</h2>

      {loadError ? (
        <p role="alert">
          Failed to load current context: {loadError}
        </p>
      ) : null}
      {loading ? <p>Loading current context...</p> : null}

      <FieldRow
        label="Current handoff summary"
        error={fieldError("current_handoff_summary", serverErrors, clientErrors)}
      >
        <textarea
          rows={6}
          value={ctx.current_handoff_summary}
          onChange={(event) => update({ current_handoff_summary: event.target.value })}
          style={{ width: "100%", fontFamily: "inherit" }}
        />
      </FieldRow>

      <FieldRow
        label="Current location"
        error={fieldError("current_location", serverErrors, clientErrors)}
        hint="mloc-* or empty"
      >
        <input
          type="text"
          value={ctx.current_location ?? ""}
          onChange={(event) => update({ current_location: nullableText(event.target.value) })}
        />
      </FieldRow>

      <IdTextArea
        label="Current cast"
        value={ctx.current_cast}
        onChange={(current_cast) => update({ current_cast })}
        allowedPrefixes={allowedPrefixes(["cast"])}
        error={fieldError("current_cast", serverErrors, clientErrors)}
      />

      <FieldRow
        label="POV holder"
        error={fieldError("pov_holder", serverErrors, clientErrors)}
      >
        <select
          value={ctx.pov_holder ?? ""}
          onChange={(event) => update({ pov_holder: nullableText(event.target.value) })}
        >
          <option value="">None</option>
          {ctx.current_cast.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </FieldRow>

      <IdTextArea
        label="Active pressure clocks"
        value={ctx.active_pressure_clocks}
        onChange={(active_pressure_clocks) => update({ active_pressure_clocks })}
        allowedPrefixes={allowedPrefixes(["clocks"])}
        error={fieldError("active_pressure_clocks", serverErrors, clientErrors)}
      />

      <IdTextArea
        label="Active secrets and questions"
        value={ctx.active_secrets_questions}
        onChange={(active_secrets_questions) => update({ active_secrets_questions })}
        allowedPrefixes={allowedPrefixes(["secrets", "questions"])}
        error={fieldError("active_secrets_questions", serverErrors, clientErrors)}
      />

      <IdTextArea
        label="Pinned records"
        value={ctx.pinned_records}
        onChange={(pinned_records) => update({ pinned_records })}
        allowedPrefixes={allManualPrefixes()}
        error={fieldError("pinned_records", serverErrors, clientErrors)}
      />

      <section aria-label="pinned-record-preview">
        <h3>Pinned record preview</h3>
        <RefList refs={pinnedRefs(ctx.pinned_records)} onRefClick={openRef} />
      </section>

      <IdTextArea
        label="Must not reveal"
        value={ctx.must_not_reveal}
        onChange={(must_not_reveal) => update({ must_not_reveal })}
        allowedPrefixes={allowedPrefixes(["secrets"])}
        error={fieldError("must_not_reveal", serverErrors, clientErrors)}
      />

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

      <FieldRow
        label="Last reviewed after segment"
        error={fieldError("last_reviewed_after_segment", serverErrors, clientErrors)}
        hint="SEG-* or empty"
      >
        <input
          type="text"
          value={ctx.last_reviewed_after_segment ?? ""}
          onChange={(event) =>
            update({ last_reviewed_after_segment: nullableText(event.target.value) })
          }
        />
      </FieldRow>

      {saveFindings.length > 0 ? (
        <section role="alert" style={{ background: "#fee", padding: 8 }}>
          <p>Current context validation failed.</p>
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
        <p role="alert">Failed to save current context: {saveError}</p>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onSave} disabled={!canSave}>
          {saving ? "Saving..." : "Save Current Context"}
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
