import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  readManuscript,
  rebuildManuscript,
  type ManuscriptResponse,
} from "../api/manuscript.js";
import {
  listSegments,
  type SegmentListEntry,
} from "../api/segments.js";
import { readMetadata } from "../api/records.js";
import { SegmentListItem } from "../components/SegmentListItem.js";
import type { ManualStoryMetadata } from "../types/manual-story.js";

export function Manuscript() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [metadata, setMetadata] = useState<ManualStoryMetadata | null>(null);
  const [manuscript, setManuscript] = useState<ManuscriptResponse | null>(null);
  const [segments, setSegments] = useState<SegmentListEntry[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    if (!worldSlug || !msSlug) return;
    setLoading(true);
    setError(null);
    try {
      const [nextMetadata, nextManuscript, nextSegments] = await Promise.all([
        readMetadata(worldSlug, msSlug),
        readManuscript(worldSlug, msSlug),
        listSegments(worldSlug, msSlug),
      ]);
      setMetadata(nextMetadata);
      setManuscript(nextManuscript);
      setSegments(nextSegments);
      setSelectedSegmentId((current) =>
        current && nextSegments.some((segment) => segment.id === current)
          ? current
          : nextSegments[0]?.id ?? null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "manuscript_load_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldSlug, msSlug]);

  const totalSegmentWords = useMemo(
    () => segments.reduce((sum, segment) => sum + segment.word_count, 0),
    [segments],
  );
  const allowReorder = metadata?.manuscript.allow_reorder === true;

  async function handleRebuild(): Promise<void> {
    if (!worldSlug || !msSlug) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await rebuildManuscript(worldSlug, msSlug);
      setNotice(
        `Rebuilt ${result.segments_compiled} segments (${result.byte_count} bytes).`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "manuscript_rebuild_failed");
    } finally {
      setBusy(false);
    }
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <section
      aria-labelledby="manuscript-heading"
      style={{ display: "grid", gap: 16 }}
    >
      <header>
        <h2 id="manuscript-heading">Manuscript</h2>
        <p style={{ margin: 0, color: "#666" }}>
          {manuscript
            ? `${manuscript.word_count} manuscript words; ${totalSegmentWords} segment words`
            : `${totalSegmentWords} segment words`}
        </p>
      </header>

      <div
        role="toolbar"
        aria-label="manuscript actions"
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <button
          type="button"
          onClick={() => void handleRebuild()}
          disabled={busy || loading}
        >
          {busy ? "Working..." : "Rebuild Manuscript"}
        </button>
        {allowReorder ? (
          <button type="button" disabled>
            Reorder
          </button>
        ) : null}
      </div>

      {loading ? <p>Loading manuscript...</p> : null}
      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
      {notice ? <p aria-live="polite">{notice}</p> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 300px) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <aside aria-label="segments">
          <h3>Segments</h3>
          {segments.length === 0 ? (
            <p>No segments yet.</p>
          ) : (
            <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
              {segments.map((segment) => (
                <Fragment key={segment.id}>
                  <SegmentListItem
                    segmentId={segment.id}
                    title={segment.title}
                    wordCount={segment.word_count}
                    selected={segment.id === selectedSegmentId}
                    onSelect={setSelectedSegmentId}
                  />
                  <li
                    key={`${segment.id}-repair`}
                    style={{ listStyle: "none", marginTop: -4 }}
                  >
                    <Link
                      to={`/worlds/${worldSlug}/manual-stories/${msSlug}/repair?segment_id=${encodeURIComponent(
                        segment.id,
                      )}`}
                      style={{
                        color: "#777",
                        display: "block",
                        fontSize: "0.8em",
                        paddingLeft: 8,
                      }}
                    >
                      Repair this segment
                    </Link>
                  </li>
                </Fragment>
              ))}
            </ul>
          )}
        </aside>

        <article aria-label="compiled manuscript">
          {manuscript ? (
            <>
              <dl>
                <dt>Path</dt>
                <dd>
                  <code>{manuscript.manuscript_path}</code>
                </dd>
                <dt>Bytes</dt>
                <dd>{manuscript.byte_count}</dd>
              </dl>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  border: "1px solid #ccc",
                  padding: 12,
                  minHeight: 320,
                  overflowX: "auto",
                }}
              >
                {manuscript.body}
              </pre>
            </>
          ) : (
            <p>No manuscript compiled yet.</p>
          )}
        </article>
      </div>
    </section>
  );
}
