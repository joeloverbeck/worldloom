import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  listRecords as apiList,
  readMetadata as apiReadMetadata,
} from "../api/records.js";
import {
  MANUAL_RECORD_CLASSES,
  type ManualRecordClass,
  type ManualRecordSummary,
  type ManualStoryMetadata,
} from "../types/manual-story.js";

const HIGH_IMPORTANCE = new Set(["high", "central"]);

export function Dashboard() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [metadata, setMetadata] = useState<ManualStoryMetadata | null>(null);
  const [directiveDraft, setDirectiveDraft] = useState("");
  const [cast, setCast] = useState<ManualRecordSummary[]>([]);
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
  });

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    apiReadMetadata(worldSlug, msSlug)
      .then((m) => {
        if (!cancelled) setMetadata(m);
      })
      .catch(() => {});
    apiList(worldSlug, msSlug, "cast")
      .then((c) => {
        if (!cancelled) setCast(c);
      })
      .catch(() => {});
    Promise.all(
      MANUAL_RECORD_CLASSES.map((cls) =>
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldSlug, msSlug]);

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

  const clockCount = byClass.clocks.length;
  const secretCount = byClass.secrets.length;
  const questionCount = byClass.questions.length;

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <div className="manual-dashboard" style={{ display: "grid", gap: 12 }}>
      <section aria-label="story-contract">
        <h2>Story contract</h2>
        {metadata ? (
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
        {cast.length === 0 ? (
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
        {highImportance.length === 0 ? (
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
      </section>

      <section aria-label="latest-segment">
        <h2>Latest segment</h2>
        <div>Wired in SPEC-103</div>
      </section>

      <section aria-label="manuscript-word-count">
        <h2>Manuscript word count</h2>
        <div>Wired in SPEC-103</div>
      </section>

      <section aria-label="generate-prompt">
        <h2>Generate prompt</h2>
        <Link
          to={`/worlds/${worldSlug}/manual-stories/${msSlug}/compose`}
        >
          Open Moment Composer (SPEC-102)
        </Link>
      </section>
    </div>
  );
}
