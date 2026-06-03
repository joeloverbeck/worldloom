import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchPromptWorkingSet } from "../api/prompt-working-set.js";
import { readManuscript, type ManuscriptResponse } from "../api/manuscript.js";
import { listPrompts, type PromptListEntry } from "../api/prompts.js";
import {
  listRecords as apiList,
  readMetadata as apiReadMetadata,
} from "../api/records.js";
import { listSegments, type SegmentListEntry } from "../api/segments.js";
import { CurrentStatePanel } from "../components/CurrentStatePanel.js";
import {
  MANUAL_RECORD_CLASSES,
  PICKABLE_RECORD_CLASSES,
  type PromptWorkingSet,
  type ManualRecordClass,
  type ManualRecordSummary,
  type ManualStoryMetadata,
} from "../types/manual-story.js";

const HIGH_IMPORTANCE = new Set(["high", "central"]);

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "request failed";
}

function segmentNumber(id: string): number {
  const match = /^SEG-(\d+)$/u.exec(id);
  const suffix = match?.[1];
  return suffix ? Number.parseInt(suffix, 10) : -1;
}

function recordClassLabel(cls: ManualRecordClass): string {
  return cls.replaceAll("-", " ");
}

function IdSubscript({ id }: { id: string }) {
  return <span className="id-subscript">{id}</span>;
}

function StatusChip({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <span className={ok ? "status-chip status-chip--ok" : "status-chip"}>
      {label}
    </span>
  );
}

export function Dashboard() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [metadata, setMetadata] = useState<ManualStoryMetadata | null>(null);
  const [directiveDraft, setDirectiveDraft] = useState("");
  const [cast, setCast] = useState<ManualRecordSummary[]>([]);
  const [segments, setSegments] = useState<SegmentListEntry[]>([]);
  const [prompts, setPrompts] = useState<PromptListEntry[]>([]);
  const [manuscript, setManuscript] = useState<ManuscriptResponse | null>(null);
  const [promptWorkingSet, setPromptWorkingSet] = useState<PromptWorkingSet | null>(
    null,
  );
  const [manuscriptMissing, setManuscriptMissing] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [promptWorkingSetError, setPromptWorkingSetError] = useState<string | null>(
    null,
  );
  const [castError, setCastError] = useState<string | null>(null);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [byClass, setByClass] = useState<
    Record<ManualRecordClass, ManualRecordSummary[]>
  >({
    cast: [],
    entities: [],
    statuses: [],
    locations: [],
    objects: [],
    facts: [],
    beliefs: [],
    intentions: [],
    plans: [],
    emotions: [],
    relationships: [],
    threads: [],
    obligations: [],
    consequences: [],
    clocks: [],
    secrets: [],
    questions: [],
    artifacts: [],
    "beat-templates": [],
  });

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setMetadataError(null);
    setPromptWorkingSetError(null);
    setCastError(null);
    setSegmentsError(null);
    setPromptsError(null);
    setRecordsError(null);
    apiReadMetadata(worldSlug, msSlug)
      .then((m) => {
        if (!cancelled) setMetadata(m);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMetadataError(loadErrorMessage(error));
      });
    fetchPromptWorkingSet(worldSlug, msSlug)
      .then((ctx) => {
        if (!cancelled) setPromptWorkingSet(ctx);
      })
      .catch((error: unknown) => {
        if (!cancelled) setPromptWorkingSetError(loadErrorMessage(error));
      });
    apiList(worldSlug, msSlug, "cast")
      .then((c) => {
        if (!cancelled) setCast(c);
      })
      .catch((error: unknown) => {
        if (!cancelled) setCastError(loadErrorMessage(error));
      });
    listSegments(worldSlug, msSlug)
      .then((s) => {
        if (!cancelled) setSegments(s);
      })
      .catch((error: unknown) => {
        if (!cancelled) setSegmentsError(loadErrorMessage(error));
      });
    listPrompts(worldSlug, msSlug)
      .then((result) => {
        if (!cancelled) setPrompts(result.prompts);
      })
      .catch((error: unknown) => {
        if (!cancelled) setPromptsError(loadErrorMessage(error));
      });
    readManuscript(worldSlug, msSlug)
      .then((m) => {
        if (cancelled) return;
        setManuscript(m);
        setManuscriptMissing(m === null);
      })
      .catch(() => {
        if (!cancelled) setManuscriptMissing(true);
      });
    Promise.all(
      PICKABLE_RECORD_CLASSES.map((cls) =>
        apiList(worldSlug, msSlug, cls).then(
          (records) => [cls, records] as const,
        ),
      ),
    )
      .then((entries) => {
        if (cancelled) return;
        const next = { ...byClass };
        for (const [cls, records] of entries) next[cls] = records;
        setByClass(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) setRecordsError(loadErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldSlug, msSlug, reloadKey]);

  const highImportance = useMemo(() => {
    const all: Array<{ cls: ManualRecordClass; record: ManualRecordSummary }> =
      [];
    for (const cls of MANUAL_RECORD_CLASSES) {
      for (const record of byClass[cls]) {
        if (HIGH_IMPORTANCE.has(record.importance)) {
          all.push({ cls, record });
        }
      }
    }
    all.sort((a, b) =>
      a.record.importance === "central" && b.record.importance !== "central"
        ? -1
        : a.record.importance !== "central" &&
            b.record.importance === "central"
          ? 1
          : a.record.title.localeCompare(b.record.title),
    );
    return all.slice(0, 20);
  }, [byClass]);

  const recentSegments = useMemo(() => {
    return [...segments]
      .sort((a, b) => {
        const byCreated = b.created_at.localeCompare(a.created_at);
        if (byCreated !== 0) return byCreated;
        return segmentNumber(b.id) - segmentNumber(a.id);
      })
      .slice(0, 3);
  }, [segments]);

  const recentPrompts = useMemo(() => {
    return [...prompts]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 3);
  }, [prompts]);

  const clockCount = byClass.clocks.length;
  const secretCount = byClass.secrets.length;
  const questionCount = byClass.questions.length;

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  function retryLoad(): void {
    setReloadKey((current) => current + 1);
  }

  return (
    <div className="manual-dashboard">
      <CurrentStatePanel
        ctx={promptWorkingSet}
        worldSlug={worldSlug}
        msSlug={msSlug}
      />
      {promptWorkingSetError ? (
        <p role="alert">
          Failed to load prompt working set: {promptWorkingSetError}{" "}
          <button type="button" onClick={retryLoad}>
            Retry
          </button>
        </p>
      ) : null}

      <div className="dashboard-cockpit-grid">
        <section aria-label="recent-segments">
          <h2>Recent segments</h2>
          {segmentsError ? (
            <p role="alert">
              Failed to load segments: {segmentsError}{" "}
              <button type="button" onClick={retryLoad}>
                Retry
              </button>
            </p>
          ) : recentSegments.length === 0 ? (
            <p>No segments yet.</p>
          ) : (
            <ol className="dashboard-compact-list">
              {recentSegments.map((segment) => (
                <li key={segment.id}>
                  <Link
                    to={`/worlds/${worldSlug}/manual-stories/${msSlug}/manuscript#${segment.id}`}
                  >
                    {segment.title || "Untitled segment"}
                  </Link>{" "}
                  <IdSubscript id={segment.id} />
                  <div className="dashboard-item-meta">
                    {segment.word_count} words · {segment.created_at}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-label="active-prompt-artifacts">
          <h2>Active prompt artifacts</h2>
          {promptsError ? (
            <p role="alert">
              Failed to load prompts: {promptsError}{" "}
              <button type="button" onClick={retryLoad}>
                Retry
              </button>
            </p>
          ) : recentPrompts.length === 0 ? (
            <p>No saved prompts yet.</p>
          ) : (
            <ol className="dashboard-compact-list">
              {recentPrompts.map((prompt) => (
                <li key={prompt.id}>
                  <Link
                    to={`/worlds/${worldSlug}/manual-stories/${msSlug}/prompt-history`}
                  >
                    {prompt.moment_directive_snippet || "Saved prompt"}
                  </Link>{" "}
                  <IdSubscript id={prompt.id} />
                  <div className="dashboard-item-meta">
                    {prompt.created_at}
                    {prompt.linked_segments.length > 0
                      ? ` · ${prompt.linked_segments.length} segment(s)`
                      : ""}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="dashboard-link-row">
            <Link
              to={`/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`}
            >
              Prompt Preview
            </Link>
            <Link
              to={`/worlds/${worldSlug}/manual-stories/${msSlug}/prompt-history`}
            >
              Prompt History
            </Link>
          </div>
        </section>

        <section aria-label="story-contract-status">
          <h2>Story contract status</h2>
          {metadataError ? (
            <p role="alert">
              Failed to load metadata: {metadataError}{" "}
              <button type="button" onClick={retryLoad}>
                Retry
              </button>
            </p>
          ) : metadata ? (
            <>
              <div className="status-chip-row">
                <StatusChip
                  label="Premise filled"
                  ok={metadata.story_contract.premise.trim().length > 0}
                />
                <StatusChip
                  label="Tone set"
                  ok={metadata.story_contract.tone.trim().length > 0}
                />
                <StatusChip
                  label="Content policy locked"
                  ok={metadata.story_contract.explicitness.trim().length > 0}
                />
              </div>
              <dl className="dashboard-contract-summary">
                <dt>POV</dt>
                <dd>{metadata.story_contract.pov}</dd>
                <dt>Tense</dt>
                <dd>{metadata.story_contract.tense}</dd>
                <dt>Intensity</dt>
                <dd>{metadata.story_contract.content_intensity}</dd>
              </dl>
              <Link
                to={`/worlds/${worldSlug}/manual-stories/${msSlug}/contract`}
              >
                {metadata.story_contract.premise === "" ||
                metadata.story_contract.tone === ""
                  ? "Set premise & tone"
                  : "Edit contract"}
              </Link>
            </>
          ) : (
            <p>Loading metadata…</p>
          )}
        </section>
      </div>

      <section aria-label="directive-draft">
        <h2>Directive draft</h2>
        <textarea
          aria-label="moment-directive-draft"
          rows={3}
          value={directiveDraft}
          onChange={(e) => setDirectiveDraft(e.target.value)}
          placeholder="What's the moment for the next segment? (saved by SPEC-102)"
          style={{ width: "100%" }}
        />
      </section>

      <section aria-label="active-cast">
        <h2>Active cast</h2>
        {castError ? (
          <p role="alert">
            Failed to load cast: {castError}{" "}
            <button type="button" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : cast.length === 0 ? (
          <p>No cast yet.</p>
        ) : (
          <ul className="dashboard-compact-list">
            {cast.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong> <IdSubscript id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="open-tracking">
        <h2>Open tracking</h2>
        {recordsError ? (
          <p role="alert">
            Failed to load tracking records: {recordsError}{" "}
            <button type="button" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : (
          <ul>
            <li>
              <Link
                to={`/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=clocks`}
              >
                Clocks
              </Link>
              : {clockCount}
            </li>
            <li>
              <Link
                to={`/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=secrets`}
              >
                Secrets
              </Link>
              : {secretCount}
            </li>
            <li>
              <Link
                to={`/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=questions`}
              >
                Questions
              </Link>
              : {questionCount}
            </li>
          </ul>
        )}
      </section>

      <section aria-label="manuscript-word-count">
        <h2>Manuscript word count</h2>
        {manuscript ? (
          <p>{manuscript.word_count} words</p>
        ) : manuscriptMissing ? (
          <p>No manuscript yet.</p>
        ) : (
          <p>Loading manuscript…</p>
        )}
      </section>

      <section aria-label="generate-prompt">
        <h2>Generate prompt</h2>
        <Link
          to={`/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`}
        >
          Open Moment Composer (SPEC-102)
        </Link>
      </section>

      <details className="importance-disclosure">
        <summary>Browse records by importance</summary>
        <section aria-label="high-importance">
          <h2>High-importance records</h2>
          {recordsError ? (
            <p role="alert">
              Failed to load records: {recordsError}{" "}
              <button type="button" onClick={retryLoad}>
                Retry
              </button>
            </p>
          ) : highImportance.length === 0 ? (
            <p>None.</p>
          ) : (
            <ul className="dashboard-compact-list">
              {highImportance.map(({ cls, record }) => (
                <li key={`${cls}/${record.id}`}>
                  <Link
                    to={`/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=${cls}&id=${record.id}`}
                  >
                    {record.title}
                  </Link>{" "}
                  <IdSubscript id={`${recordClassLabel(cls)} / ${record.id}`} />
                  <div className="dashboard-item-meta">
                    {record.importance}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </details>
    </div>
  );
}
