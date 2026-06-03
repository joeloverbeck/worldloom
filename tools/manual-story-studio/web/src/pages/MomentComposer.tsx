import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { fetchPromptWorkingSet } from "../api/prompt-working-set.js";
import { previewPrompt } from "../api/prompts.js";
import { readMetadata } from "../api/records.js";
import { BeatTemplateCandidates } from "../components/BeatTemplateCandidates.js";
import { RecordPicker } from "../components/RecordPicker.js";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges.js";
import {
  BEAT_TEMPLATE_PRESSURE_TYPES,
  PICKABLE_RECORD_CLASSES,
  type BeatTemplatePressureType,
  type ManualRecordClass,
  type ManualStoryMetadata,
} from "../types/manual-story.js";

// Cast has its own dedicated picker; beat-templates is excluded by
// PICKABLE_RECORD_CLASSES (it is served by /beat-templates, not /records).
const COMPOSER_RECORD_CLASSES: ManualRecordClass[] = PICKABLE_RECORD_CLASSES.filter(
  (recordClass) => recordClass !== "cast",
);

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "request failed";
}

interface ComposerNavState {
  moment_directive?: string;
  included_cast?: string[];
  included_records?: string[];
  focusHint?: "directive" | "cast" | "records" | "template";
}

export function MomentComposer() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as ComposerNavState;

  const [metadata, setMetadata] = useState<ManualStoryMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [promptWorkingSetError, setPromptWorkingSetError] = useState<string | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);

  const [momentDirective, setMomentDirective] = useState(
    navState.moment_directive ?? "",
  );
  const [includedCast, setIncludedCast] = useState<string[]>(
    navState.included_cast ?? [],
  );
  const [pinnedRecordIds, setPinnedRecordIds] = useState<string[]>(
    navState.included_records ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [desiredPressureType, setDesiredPressureType] = useState<
    BeatTemplatePressureType | ""
  >("");

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setMetadataError(null);
    setPromptWorkingSetError(null);
    Promise.all([
      readMetadata(worldSlug, msSlug)
        .then((value) => ({ ok: true as const, value }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      fetchPromptWorkingSet(worldSlug, msSlug)
        .then((value) => ({ ok: true as const, value }))
        .catch((error: unknown) => ({ ok: false as const, error })),
    ]).then(([metadataResult, promptWorkingSetResult]) => {
      if (cancelled) return;
      if (!metadataResult.ok) {
        setMetadataError(loadErrorMessage(metadataResult.error));
        return;
      }
      const m = metadataResult.value;
      if (!m) return;
      setMetadata(m);

      const promptWorkingSet = promptWorkingSetResult.ok
        ? promptWorkingSetResult.value
        : null;
      if (!promptWorkingSetResult.ok) {
        setPromptWorkingSetError(loadErrorMessage(promptWorkingSetResult.error));
      }

      if (!navState.included_cast) {
        const contextCast = promptWorkingSet?.current_cast ?? [];
        setIncludedCast(
          contextCast.length > 0 ? contextCast : (m.cast_order ?? []),
        );
      }
      if (!navState.included_records) {
        const contextPins = promptWorkingSet?.pinned_records ?? [];
        if (contextPins.length > 0) {
          setPinnedRecordIds(contextPins);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, reloadKey]);

  const unsavedChanges = useUnsavedChanges(
    {
      momentDirective,
      includedCast,
      pinnedRecordIds,
      selectedTemplateId,
      desiredPressureType,
    },
    { resetKeys: [worldSlug, msSlug] },
  );

  const canGenerate =
    momentDirective.trim().length > 0 && includedCast.length > 0;

  async function onGenerate(): Promise<void> {
    if (!canGenerate || !worldSlug || !msSlug) return;
    setSubmitting(true);
    setError(null);
    try {
      const composeInput: Parameters<typeof previewPrompt>[2] = {
        moment_directive: momentDirective,
        included_cast: includedCast,
        included_records: pinnedRecordIds,
      };
      if (selectedTemplateId !== null) {
        composeInput.selected_template = selectedTemplateId;
      }
      const result = await previewPrompt(worldSlug, msSlug, composeInput);
      unsavedChanges.reset();
      navigate(
        `/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        { state: { composeResult: result, composeInput } },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "preview_failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  function retryLoad(): void {
    setReloadKey((current) => current + 1);
  }

  return (
    <section aria-labelledby="moment-composer-heading" style={{ display: "grid", gap: 16 }}>
      <h2 id="moment-composer-heading">Moment Composer</h2>
      {metadataError ? (
        <p role="alert">
          Failed to load manual story metadata: {metadataError}{" "}
          <button type="button" onClick={retryLoad}>
            Retry
          </button>
        </p>
      ) : metadata ? null : (
        <p>Loading manual story metadata…</p>
      )}
      {promptWorkingSetError ? (
        <p role="alert">
          Failed to load prompt working set: {promptWorkingSetError}{" "}
          <button type="button" onClick={retryLoad}>
            Retry
          </button>
        </p>
      ) : null}

      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontWeight: 600 }}>Moment directive</span>
        <textarea
          aria-label="moment directive"
          rows={6}
          value={momentDirective}
          onChange={(e) => setMomentDirective(e.target.value)}
          required
          style={{ width: "100%", fontFamily: "inherit" }}
          placeholder="What should the next prose depict? Free-form, authorial voice."
        />
      </label>

      <fieldset aria-label="involved cast">
        <legend>Involved cast</legend>
        <RecordPicker
          worldSlug={worldSlug}
          msSlug={msSlug}
          label="Involved cast"
          classes={["cast"]}
          mode="multi"
          value={includedCast}
          onChange={setIncludedCast}
        />
      </fieldset>

      <fieldset aria-label="relevant records">
        <legend>Relevant records</legend>
        <RecordPicker
          worldSlug={worldSlug}
          msSlug={msSlug}
          label="Relevant records"
          classes={COMPOSER_RECORD_CLASSES}
          mode="multi"
          value={pinnedRecordIds}
          onChange={setPinnedRecordIds}
          pinnedIds={pinnedRecordIds}
        />
      </fieldset>

      <fieldset aria-label="beat-template">
        <legend>Beat template</legend>
        <label style={{ display: "block", marginBottom: 8 }}>
          Desired pressure type{" "}
          <select
            value={desiredPressureType}
            onChange={(e) =>
              setDesiredPressureType(e.target.value as BeatTemplatePressureType | "")
            }
          >
            <option value="">Any</option>
            {BEAT_TEMPLATE_PRESSURE_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </label>
        <BeatTemplateCandidates
          worldSlug={worldSlug}
          msSlug={msSlug}
          candidateInput={{
            moment_directive: momentDirective,
            selected_cast: includedCast,
            ...(desiredPressureType
              ? { optional_desired_pressure_type: desiredPressureType }
              : {}),
          }}
          selectedTemplateId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
        />
      </fieldset>

      <div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || submitting}
        >
          {submitting ? "Generating…" : "Generate Prompt"}
        </button>
        {!canGenerate ? (
          <p style={{ color: "#888" }}>
            <em>Generate is enabled when the moment directive is non-empty and at least one cast member is involved.</em>
          </p>
        ) : null}
      </div>

      {error ? <p role="alert" style={{ color: "crimson" }}>{error}</p> : null}
    </section>
  );
}
