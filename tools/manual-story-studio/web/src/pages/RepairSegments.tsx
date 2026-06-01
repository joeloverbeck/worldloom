import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  deleteSegment,
  editSegment,
  listSegments,
  readSegment,
  type SegmentListEntry,
} from "../api/segments.js";

const WARNING_BANNER_TEXT =
  "Repair mode bypasses the cockpit's append-only discipline; use only for corrupted or accidentally-saved segments.";

interface ActiveEdit {
  segmentId: string;
  prose: string;
  title: string;
  forceReplace: boolean;
}

function displayTitle(segment: SegmentListEntry): string {
  return segment.title.trim().length > 0 ? segment.title : segment.id;
}

export function RepairSegments() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [searchParams] = useSearchParams();
  const preSelectedId = searchParams.get("segment_id");
  const preSelectedRef = useRef<HTMLLIElement | null>(null);

  const [segments, setSegments] = useState<SegmentListEntry[]>([]);
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    if (!worldSlug || !msSlug) return;
    setLoading(true);
    setError(null);
    try {
      setSegments(await listSegments(worldSlug, msSlug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_list_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldSlug, msSlug]);

  useEffect(() => {
    if (!preSelectedId || !preSelectedRef.current) return;
    preSelectedRef.current.scrollIntoView({ block: "center" });
  }, [preSelectedId, segments]);

  const latestSegmentId = useMemo(
    () => segments.at(-1)?.id ?? null,
    [segments],
  );
  const activeEditIsLatest = activeEdit?.segmentId === latestSegmentId;

  async function openReplace(segment: SegmentListEntry): Promise<void> {
    if (!worldSlug || !msSlug) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await readSegment(worldSlug, msSlug, segment.id);
      if (!result) {
        setError(`Segment ${segment.id} was not found.`);
        return;
      }
      setActiveEdit({
        segmentId: segment.id,
        prose: result.body,
        title: segment.title,
        forceReplace: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_read_failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitReplace(): Promise<void> {
    if (!worldSlug || !msSlug || !activeEdit) return;
    if (
      !window.confirm(
        `Replace prose for ${activeEdit.segmentId}? The current segment prose will be overwritten.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await editSegment(
        worldSlug,
        msSlug,
        activeEdit.segmentId,
        {
          prose: activeEdit.prose,
          title: activeEdit.title,
        },
        {
          mode: "repair",
          force_replace: activeEdit.forceReplace || undefined,
        },
      );
      setNotice(`Replaced prose for ${activeEdit.segmentId}.`);
      setActiveEdit(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_replace_failed");
    } finally {
      setBusy(false);
    }
  }

  async function discardSegment(segmentId: string): Promise<void> {
    if (!worldSlug || !msSlug) return;
    if (
      !window.confirm(
        `Discard segment ${segmentId}? This removes the segment from the manual story files.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await deleteSegment(worldSlug, msSlug, segmentId, {
        mode: "repair",
        force: true,
      });
      if (!("outcome" in result)) {
        setError(`Segment ${segmentId} was not found.`);
        return;
      }
      setNotice(`Discarded ${segmentId}.`);
      if (activeEdit?.segmentId === segmentId) setActiveEdit(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_discard_failed");
    } finally {
      setBusy(false);
    }
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <section
      aria-labelledby="repair-heading"
      style={{ display: "grid", gap: 16 }}
    >
      <header>
        <h2 id="repair-heading">Repair segments</h2>
        <p
          role="alert"
          style={{
            borderColor: "#b85318",
            background: "#fff2df",
            color: "#5b2a00",
            fontWeight: 600,
            margin: 0,
          }}
        >
          {WARNING_BANNER_TEXT}
        </p>
      </header>

      {loading ? <p aria-busy="true">Loading segments...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p aria-live="polite">{notice}</p> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 320px) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <aside aria-label="repairable segments">
          <h3>Segments</h3>
          {segments.length === 0 ? (
            <p>No segments yet.</p>
          ) : (
            <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
              {segments.map((segment) => {
                const isLatest = segment.id === latestSegmentId;
                const isPreSelected = segment.id === preSelectedId;
                return (
                  <li
                    key={segment.id}
                    id={segment.id}
                    ref={isPreSelected ? preSelectedRef : null}
                    style={{
                      listStyle: "none",
                      border: isPreSelected
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border)",
                      background: isPreSelected ? "#eef3ff" : "var(--surface)",
                      borderRadius: 4,
                      padding: 10,
                    }}
                  >
                    <strong>{displayTitle(segment)}</strong>
                    <span style={{ display: "block", color: "#666" }}>
                      {segment.id} - {segment.word_count} words
                    </span>
                    <span style={{ display: "block", color: "#666" }}>
                      {isLatest
                        ? "Latest segment"
                        : "Earlier segment; replacement requires force_replace"}
                    </span>
                    <div
                      role="toolbar"
                      aria-label={`${segment.id} repair actions`}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => void openReplace(segment)}
                        disabled={busy}
                      >
                        Replace prose
                      </button>
                      <button
                        type="button"
                        onClick={() => void discardSegment(segment.id)}
                        disabled={busy}
                        style={{
                          background: "#7a2a2a",
                          borderColor: "#7a2a2a",
                        }}
                      >
                        Discard segment
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section aria-label="replace prose">
          {activeEdit ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitReplace();
              }}
            >
              <h3>Replace prose for {activeEdit.segmentId}</h3>
              <label>
                Title
                <input
                  value={activeEdit.title}
                  onChange={(event) =>
                    setActiveEdit({
                      ...activeEdit,
                      title: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Prose
                <textarea
                  rows={18}
                  value={activeEdit.prose}
                  onChange={(event) =>
                    setActiveEdit({
                      ...activeEdit,
                      prose: event.target.value,
                    })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              {!activeEditIsLatest ? (
                <label style={{ flexDirection: "row", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={activeEdit.forceReplace}
                    onChange={(event) =>
                      setActiveEdit({
                        ...activeEdit,
                        forceReplace: event.target.checked,
                      })
                    }
                    style={{ width: "auto" }}
                  />
                  force_replace
                </label>
              ) : null}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setActiveEdit(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || activeEdit.prose.trim().length === 0}
                >
                  {busy ? "Replacing..." : "Replace prose"}
                </button>
              </div>
            </form>
          ) : (
            <p>Select a segment to replace its prose.</p>
          )}
        </section>
      </div>
    </section>
  );
}
