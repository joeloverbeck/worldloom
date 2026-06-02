import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { fetchCurrentContext } from "../api/current-context.js";
import { previewPrompt } from "../api/prompts.js";
import { listRecords, readMetadata } from "../api/records.js";
import { BeatTemplateCandidates } from "../components/BeatTemplateCandidates.js";
import {
  MANUAL_RECORD_CLASSES,
  type ManualRecordClass,
  type ManualRecordSummary,
  type ManualStoryMetadata,
} from "../types/manual-story.js";

const SUGGEST_IMPORTANCE = new Set(["high", "central"]);

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "request failed";
}

interface RecordWithClass {
  cls: ManualRecordClass;
  summary: ManualRecordSummary;
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
  const [allCast, setAllCast] = useState<ManualRecordSummary[]>([]);
  const [allRecords, setAllRecords] = useState<RecordWithClass[]>([]);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [currentContextError, setCurrentContextError] = useState<string | null>(
    null,
  );
  const [castError, setCastError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setMetadataError(null);
    setCurrentContextError(null);
    setCastError(null);
    setRecordsError(null);
    Promise.all([
      readMetadata(worldSlug, msSlug)
        .then((value) => ({ ok: true as const, value }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      fetchCurrentContext(worldSlug, msSlug)
        .then((value) => ({ ok: true as const, value }))
        .catch((error: unknown) => ({ ok: false as const, error })),
    ]).then(([metadataResult, currentContextResult]) => {
      if (cancelled) return;
      if (!metadataResult.ok) {
        setMetadataError(loadErrorMessage(metadataResult.error));
        return;
      }
      const m = metadataResult.value;
      if (!m) return;
      setMetadata(m);

      const currentContext = currentContextResult.ok
        ? currentContextResult.value
        : null;
      if (!currentContextResult.ok) {
        setCurrentContextError(loadErrorMessage(currentContextResult.error));
      }

      if (!navState.included_cast) {
        const contextCast = currentContext?.current_cast ?? [];
        setIncludedCast(
          contextCast.length > 0 ? contextCast : (m.cast_order ?? []),
        );
      }
      if (!navState.included_records) {
        const contextPins = currentContext?.pinned_records ?? [];
        if (contextPins.length > 0) {
          setPinnedRecordIds(contextPins);
        }
      }
    });
    listRecords(worldSlug, msSlug, "cast")
      .then((c) => {
        if (!cancelled) setAllCast(c);
      })
      .catch((error: unknown) => {
        if (!cancelled) setCastError(loadErrorMessage(error));
      });
    Promise.all(
      MANUAL_RECORD_CLASSES.filter((c) => c !== "cast").map((cls) =>
        listRecords(worldSlug, msSlug, cls).then(
          (records) => ({ cls, records }),
        ),
      ),
    )
      .then((entries) => {
        if (cancelled) return;
        const flat: RecordWithClass[] = [];
        for (const { cls, records } of entries) {
          for (const r of records) {
            if (r.active) flat.push({ cls, summary: r });
          }
        }
        setAllRecords(flat);
      })
      .catch((error: unknown) => {
        if (!cancelled) setRecordsError(loadErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, reloadKey]);

  const suggested = useMemo(() => {
    const out: RecordWithClass[] = [];
    for (const entry of allRecords) {
      if (pinnedRecordIds.includes(entry.summary.id)) continue;
      if (SUGGEST_IMPORTANCE.has(entry.summary.importance)) {
        out.push(entry);
      }
    }
    return out;
  }, [allRecords, pinnedRecordIds]);

  const pinned = useMemo(
    () =>
      allRecords.filter((entry) => pinnedRecordIds.includes(entry.summary.id)),
    [allRecords, pinnedRecordIds],
  );

  const canGenerate =
    momentDirective.trim().length > 0 && includedCast.length > 0;

  function toggleCast(id: string): void {
    setIncludedCast((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function pinRecord(id: string): void {
    setPinnedRecordIds((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
  }

  function unpinRecord(id: string): void {
    setPinnedRecordIds((prev) => prev.filter((x) => x !== id));
  }

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
      {currentContextError ? (
        <p role="alert">
          Failed to load current context: {currentContextError}{" "}
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
        {castError ? (
          <p role="alert">
            Failed to load cast: {castError}{" "}
            <button type="button" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : allCast.length === 0 ? (
          <p><em>No cast records on file.</em></p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {allCast.map((c) => (
              <li key={c.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={includedCast.includes(c.id)}
                    onChange={() => toggleCast(c.id)}
                  />{" "}
                  {c.title}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset aria-label="relevant records">
        <legend>Relevant records</legend>
        {recordsError ? (
          <p role="alert">
            Failed to load records: {recordsError}{" "}
            <button type="button" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <h4>Suggested ({suggested.length})</h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {suggested.map(({ cls, summary }) => (
                <li key={summary.id}>
                  <button type="button" onClick={() => pinRecord(summary.id)}>
                    + Pin
                  </button>{" "}
                  <span style={{ fontFamily: "monospace", fontSize: "0.85em" }}>
                    [{cls}]
                  </span>{" "}
                  {summary.title}{" "}
                  <em>({summary.importance})</em>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Pinned ({pinned.length})</h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {pinned.map(({ cls, summary }) => (
                <li key={summary.id}>
                  <button type="button" onClick={() => unpinRecord(summary.id)}>
                    − Unpin
                  </button>{" "}
                  <span style={{ fontFamily: "monospace", fontSize: "0.85em" }}>
                    [{cls}]
                  </span>{" "}
                  {summary.title}
                </li>
              ))}
            </ul>
          </div>
          </div>
        )}
      </fieldset>

      <fieldset aria-label="beat-template">
        <legend>Beat template</legend>
        <BeatTemplateCandidates
          worldSlug={worldSlug}
          msSlug={msSlug}
          candidateInput={{
            moment_directive: momentDirective,
            selected_cast: includedCast,
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
