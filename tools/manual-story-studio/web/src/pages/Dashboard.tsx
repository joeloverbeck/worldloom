import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  listRecords as apiList,
  readMetadata as apiReadMetadata,
} from "../api/records.js";
import { readManuscript, type ManuscriptResponse } from "../api/manuscript.js";
import { listSegments, type SegmentListEntry } from "../api/segments.js";
import {
  MANUAL_RECORD_CLASSES,
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

export function Dashboard() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [metadata, setMetadata] = useState<ManualStoryMetadata | null>(null);
  const [directiveDraft, setDirectiveDraft] = useState("");
  const [cast, setCast] = useState<ManualRecordSummary[]>([]);
  const [segments, setSegments] = useState<SegmentListEntry[]>([]);
  const [manuscript, setManuscript] = useState<ManuscriptResponse | null>(null);
  const [manuscriptMissing, setManuscriptMissing] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [castError, setCastError] = useState<string | null>(null);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
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
    setCastError(null);
    setSegmentsError(null);
    setRecordsError(null);
    apiReadMetadata(worldSlug, msSlug)
      .then((m) => {
        if (!cancelled) setMetadata(m);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMetadataError(loadErrorMessage(error));
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
      MANUAL_RECORD_CLASSES.filter((cls) => cls !== "beat-templates").map(
        (cls) =>
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
    const all: Array<{ cls: ManualRecordClass; record: ManualRecordSummary }> = [];
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
        : a.record.importance !== "central" && b.record.importance === "central"
          ? 1
          : a.record.title.localeCompare(b.record.title),
    );
    return all.slice(0, 20);
  }, [byClass]);

  const latestSegment = useMemo(() => {
    if (segments.length === 0) return null;
    return [...segments].sort((a, b) => {
      const byCreated = b.created_at.localeCompare(a.created_at);
      if (byCreated !== 0) return byCreated;
      return segmentNumber(b.id) - segmentNumber(a.id);
    })[0];
  }, [segments]);

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
    <div className="manual-dashboard" style={{ display: "grid", gap: 12 }}>
      <nav
        aria-label="story-pages"
        style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
      >
        <Link to={`/worlds/${worldSlug}/manual-stories/${msSlug}/records`}>
          Records
        </Link>
        <Link to={`/worlds/${worldSlug}/manual-stories/${msSlug}/cast`}>
          Cast &amp; profiles
        </Link>
        <Link to={`/worlds/${worldSlug}/manual-stories/${msSlug}/manuscript`}>
          Manuscript
        </Link>
        <Link
          to={`/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates`}
        >
          Beat templates
        </Link>
        <Link
          to={`/worlds/${worldSlug}/manual-stories/${msSlug}/prompt-history`}
        >
          Prompt history
        </Link>
        <Link to={`/worlds/${worldSlug}/manual-stories/${msSlug}/paste-prose`}>
          Paste prose
        </Link>
      </nav>

      <section aria-label="story-contract">
        <h2>Story contract</h2>
        {metadataError ? (
          <p role="alert">
            Failed to load metadata: {metadataError}{" "}
            <button type="button" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : metadata ? (
          <>
            <dl>
              <dt>Premise</dt>
              <dd>{metadata.story_contract.premise || <em>(unset)</em>}</dd>
              <dt>Tone</dt>
              <dd>{metadata.story_contract.tone || <em>(unset)</em>}</dd>
              <dt>POV</dt>
              <dd>{metadata.story_contract.pov}</dd>
              <dt>Tense</dt>
              <dd>{metadata.story_contract.tense}</dd>
              <dt>Content intensity</dt>
              <dd>{metadata.story_contract.content_intensity}</dd>
              <dt>Language register</dt>
              <dd>{metadata.story_contract.language_register}</dd>
              <dt>Prose preferences</dt>
              <dd>
                psychic_distance={metadata.story_contract.prose_preferences.psychic_distance},{" "}
                dialogue_density={metadata.story_contract.prose_preferences.dialogue_density},{" "}
                interiority={metadata.story_contract.prose_preferences.interiority},{" "}
                paragraphing={metadata.story_contract.prose_preferences.paragraphing}
              </dd>
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
          <ul>
            {cast.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong> <em>{c.id}</em>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          <ul>
            {highImportance.map(({ cls, record }) => (
              <li key={`${cls}/${record.id}`}>
                <Link
                  to={`/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=${cls}&id=${record.id}`}
                >
                  {cls}/{record.id}
                </Link>{" "}
                — {record.title} ({record.importance})
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

      <section aria-label="latest-segment">
        <h2>Latest segment</h2>
        {segmentsError ? (
          <p role="alert">
            Failed to load segments: {segmentsError}{" "}
            <button type="button" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : latestSegment ? (
          <p>
            <Link
              to={`/worlds/${worldSlug}/manual-stories/${msSlug}/manuscript#${latestSegment.id}`}
            >
              {latestSegment.title || latestSegment.id}
            </Link>{" "}
            <em>{latestSegment.id}</em> — {latestSegment.created_at}
          </p>
        ) : (
          <p>No segments yet.</p>
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
    </div>
  );
}
