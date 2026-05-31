import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { previewPrompt } from "../api/prompts.js";
import { listRecords, readMetadata } from "../api/records.js";
import {
  MANUAL_RECORD_CLASSES,
  type ManualRecordClass,
  type ManualRecordSummary,
  type ManualStoryMetadata,
} from "../types/manual-story.js";

const SUGGEST_IMPORTANCE = new Set(["high", "central"]);

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

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    readMetadata(worldSlug, msSlug)
      .then((m) => {
        if (cancelled || !m) return;
        setMetadata(m);
        // Default involved cast = cast_order from metadata.
        if (!navState.included_cast) {
          setIncludedCast(m.cast_order ?? []);
        }
      })
      .catch(() => {});
    listRecords(worldSlug, msSlug, "cast")
      .then((c) => {
        if (!cancelled) setAllCast(c);
      })
      .catch(() => {});
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug]);

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
      const composeInput = {
        moment_directive: momentDirective,
        included_cast: includedCast,
        included_records: pinnedRecordIds,
      };
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

  return (
    <section aria-labelledby="moment-composer-heading" style={{ display: "grid", gap: 16 }}>
      <h2 id="moment-composer-heading">Moment Composer</h2>
      {metadata ? null : <p>Loading manual story metadata…</p>}

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
        {allCast.length === 0 ? (
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
      </fieldset>

      <fieldset aria-label="beat-template placeholder">
        <legend>Beat template</legend>
        <p>
          <em>Reserved for SPEC-104. No template selector in this iteration.</em>
        </p>
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
