import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  createRecord as apiCreate,
  deleteRecord as apiDelete,
  readRecord as apiRead,
  updateRecord as apiUpdate,
  type CreateResult,
  type DeleteResult,
} from "../api/records.js";
import { RecordCard } from "../components/RecordCard.js";
import { RecordForm } from "../components/RecordForm.js";
import type {
  ManualRecord,
  ManualRecordClass,
  ManualRecordSummary,
  SegmentSidecarIncludedRecordSummary,
} from "../types/manual-story.js";

interface WorkbenchSegment {
  id: string;
  body: string;
  title: string;
  prompt_id: string | null;
  moment_directive: string;
  word_count: number;
  last_paragraph: string;
  included_record_summary: SegmentSidecarIncludedRecordSummary;
}

interface WorkbenchCandidate {
  recordClass: ManualRecordClass;
  id: string;
  title: string;
  active: boolean;
  target_ids: string[];
  fields: string[];
}

interface WorkbenchPayload {
  segment: WorkbenchSegment;
  reminder: string;
  touched_records: WorkbenchCandidate[];
}

const QUICK_ADD_CLASSES: ManualRecordClass[] = [
  "facts",
  "beliefs",
  "emotions",
  "plans",
  "relationships",
  "clocks",
  "secrets",
  "questions",
  "consequences",
  "statuses",
];

const DEFAULT_REMINDER =
  "Segment saved. Manual Studio did not infer record changes. Update only the records you want to change.";

function enc(value: string): string {
  return encodeURIComponent(value);
}

function workbenchApiPath(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/segments/${enc(segmentId)}/post-segment-workbench`;
}

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function candidateSummary(candidate: WorkbenchCandidate): ManualRecordSummary {
  return {
    id: candidate.id,
    title: candidate.title,
    active: candidate.active,
    importance: "medium",
    tags: [],
    summary: "",
    prompt_visibility: "always",
  };
}

function reasonForCandidate(candidate: WorkbenchCandidate): string {
  return `${candidate.fields.join(", ")} -> ${candidate.target_ids.join(", ")}`;
}

function initialRecordForSegment(
  payload: WorkbenchPayload | null,
  includePromptLinks: boolean,
): Partial<ManualRecord> {
  return {
    refs: {
      characters:
        includePromptLinks
          ? (payload?.segment.included_record_summary.characters ?? [])
          : [],
      locations: [],
      related_records:
        includePromptLinks
          ? (payload?.segment.included_record_summary.records ?? [])
          : [],
    },
    summary: "",
    details: "",
    tags: payload ? [`segment:${payload.segment.id.toLowerCase()}`] : [],
  };
}

function RenderedProse(props: { markdown: string }) {
  const blocks = props.markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  if (blocks.length === 0) return <p>No accepted prose.</p>;
  return (
    <div className="post-workbench-prose">
      {blocks.map((block, index) => {
        if (block.startsWith("### ")) {
          return <h4 key={index}>{block.slice(4)}</h4>;
        }
        if (block.startsWith("## ")) {
          return <h3 key={index}>{block.slice(3)}</h3>;
        }
        if (block.startsWith("# ")) {
          return <h2 key={index}>{block.slice(2)}</h2>;
        }
        return <p key={index}>{block}</p>;
      })}
    </div>
  );
}

export function PostSegmentWorkbench() {
  const { worldSlug, msSlug, segmentId } = useParams<{
    worldSlug: string;
    msSlug: string;
    segmentId: string;
  }>();
  const [payload, setPayload] = useState<WorkbenchPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeClass, setActiveClass] = useState<ManualRecordClass>("facts");
  const [selected, setSelected] = useState<{
    recordClass: ManualRecordClass;
    id: string;
  } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ManualRecord | null>(null);
  const [creatingClass, setCreatingClass] = useState<ManualRecordClass | null>(null);
  const [saveError, setSaveError] = useState<
    Exclude<CreateResult, { ok: true }> | null
  >(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deleteOutcome, setDeleteOutcome] = useState<DeleteResult | null>(null);
  const [linkPromptRecordsToNewRecord, setLinkPromptRecordsToNewRecord] =
    useState(false);
  const proseRef = useRef<HTMLDivElement | null>(null);
  const [selectedProse, setSelectedProse] = useState("");
  const [noteInsertion, setNoteInsertion] = useState<{
    id: number;
    targetKey: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!worldSlug || !msSlug || !segmentId) return;
    let cancelled = false;
    setLoadError(null);
    fetch(workbenchApiPath(worldSlug, msSlug, segmentId))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`post-segment workbench -> ${response.status}`);
        }
        return (await response.json()) as WorkbenchPayload;
      })
      .then((next) => {
        if (!cancelled) {
          setPayload(next);
          setSelected(null);
          setSelectedRecord(null);
          setCreatingClass(null);
          setLinkPromptRecordsToNewRecord(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPayload(null);
          setLoadError(loadErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, segmentId]);

  useEffect(() => {
    if (!worldSlug || !msSlug || !selected) {
      setSelectedRecord(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailError(null);
    apiRead(worldSlug, msSlug, selected.recordClass, selected.id)
      .then((record) => {
        if (!cancelled) {
          setSelectedRecord(record);
          setDetailError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSelectedRecord(null);
          setDetailError(loadErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, selected]);

  const groupedCandidates = useMemo(() => {
    const groups = new Map<ManualRecordClass, WorkbenchCandidate[]>();
    for (const candidate of payload?.touched_records ?? []) {
      const entries = groups.get(candidate.recordClass);
      if (entries) {
        entries.push(candidate);
      } else {
        groups.set(candidate.recordClass, [candidate]);
      }
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [payload]);
  const activeRecordFormKey = creatingClass
    ? `new:${creatingClass}`
    : selectedRecord && selected
      ? `${selected.recordClass}:${selectedRecord.id}`
      : null;
  const recordFormOpen = activeRecordFormKey !== null;

  function refreshSelectedProse() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    const range =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const proseRoot = proseRef.current;
    if (!text || !range || !proseRoot) {
      setSelectedProse("");
      return;
    }
    const selectedInsideProse =
      proseRoot.contains(range.commonAncestorContainer) ||
      proseRoot.contains(range.startContainer) ||
      proseRoot.contains(range.endContainer);
    setSelectedProse(selectedInsideProse ? text : "");
  }

  function copySelectedProseIntoNotes() {
    if (!selectedProse || !activeRecordFormKey) return;
    setNoteInsertion({
      id: Date.now(),
      targetKey: activeRecordFormKey,
      text: selectedProse,
    });
  }

  async function handleSave(
    record: ManualRecord,
    opts?: { overrideBrokenRefs?: boolean },
  ): Promise<boolean> {
    if (!worldSlug || !msSlug) return false;
    setSaveError(null);
    if (creatingClass) {
      const result = await apiCreate(worldSlug, msSlug, creatingClass, record, opts);
      if (result.ok) {
        setCreatingClass(null);
        setActiveClass(creatingClass);
        setSelected({ recordClass: creatingClass, id: result.id });
        return true;
      }
      setSaveError(result);
      return false;
    }
    if (selected) {
      const result = await apiUpdate(
        worldSlug,
        msSlug,
        selected.recordClass,
        selected.id,
        record,
        opts,
      );
      if (result.ok) {
        setSelectedRecord(result.record);
        return true;
      }
      if (result.error !== "not_found") setSaveError(result);
    }
    return false;
  }

  async function handleDelete() {
    if (!worldSlug || !msSlug || !selected) return;
    const result = await apiDelete(
      worldSlug,
      msSlug,
      selected.recordClass,
      selected.id,
    );
    setDeleteOutcome(result);
    if ("outcome" in result && result.outcome === "hard_deleted") {
      setSelected(null);
      setSelectedRecord(null);
    }
  }

  async function handleForceDelete() {
    if (!worldSlug || !msSlug || !selected) return;
    const result = await apiDelete(
      worldSlug,
      msSlug,
      selected.recordClass,
      selected.id,
      { force: true, mode: "repair" },
    );
    setDeleteOutcome(result);
    if ("outcome" in result && result.outcome === "force_deleted") {
      setSelected(null);
      setSelectedRecord(null);
    }
  }

  if (!worldSlug || !msSlug || !segmentId) {
    return <p role="alert">Missing world, manual story, or segment id.</p>;
  }

  if (loadError) {
    return <p role="alert">Failed to load post-segment workbench: {loadError}</p>;
  }

  if (!payload) {
    return <p>Loading post-segment workbench...</p>;
  }

  return (
    <div className="post-workbench">
      <header className="post-workbench-header">
        <div>
          <p className="post-workbench-kicker">{payload.segment.id}</p>
          <h2>{payload.segment.title}</h2>
        </div>
        <p className="post-workbench-reminder">
          {payload.reminder || DEFAULT_REMINDER}
        </p>
      </header>

      <section className="post-workbench-layout" aria-label="post-segment workbench">
        <article className="post-workbench-segment" aria-label="accepted segment">
          <dl className="post-workbench-meta">
            <div>
              <dt>Prompt</dt>
              <dd>{payload.segment.prompt_id ?? "none"}</dd>
            </div>
            <div>
              <dt>Words</dt>
              <dd>{payload.segment.word_count}</dd>
            </div>
            <div>
              <dt>Moment</dt>
              <dd>{payload.segment.moment_directive}</dd>
            </div>
            <div>
              <dt>Last paragraph</dt>
              <dd>{payload.segment.last_paragraph || "none"}</dd>
            </div>
            <div>
              <dt>Included cast</dt>
              <dd>
                {payload.segment.included_record_summary.characters.join(", ") ||
                  "none"}
              </dd>
            </div>
            <div>
              <dt>Included records</dt>
              <dd>
                {payload.segment.included_record_summary.records.join(", ") ||
                  "none"}
              </dd>
            </div>
          </dl>
          <div
            ref={proseRef}
            onMouseUp={refreshSelectedProse}
            onKeyUp={refreshSelectedProse}
          >
            <RenderedProse markdown={payload.segment.body} />
          </div>
          <button
            type="button"
            onClick={copySelectedProseIntoNotes}
            disabled={!selectedProse || !recordFormOpen}
          >
            Copy selected prose into notes
          </button>
        </article>

        <aside className="post-workbench-rail" aria-label="records that touch this segment">
          <h3>Records that touch this segment</h3>
          {groupedCandidates.length === 0 ? (
            <p>No candidate records.</p>
          ) : (
            groupedCandidates.map(([recordClass, candidates]) => (
              <section key={recordClass} className="post-workbench-candidate-group">
                <h4>{recordClass}</h4>
                {candidates.map((candidate) => (
                  <RecordCard
                    key={`${candidate.recordClass}:${candidate.id}`}
                    summary={candidateSummary(candidate)}
                    recordClass={candidate.recordClass}
                    compact
                    reason={reasonForCandidate(candidate)}
                    selected={
                      selected?.recordClass === candidate.recordClass &&
                      selected.id === candidate.id
                    }
                    onOpen={(id) => {
                      setSelected({ recordClass: candidate.recordClass, id });
                      setActiveClass(candidate.recordClass);
                      setCreatingClass(null);
                      setLinkPromptRecordsToNewRecord(false);
                      setSaveError(null);
                      setDeleteOutcome(null);
                    }}
                  />
                ))}
              </section>
            ))
          )}
        </aside>

        <section className="post-workbench-detail" aria-label="record workbench">
          <header className="post-workbench-tools">
            {QUICK_ADD_CLASSES.map((recordClass) => (
              <button
                type="button"
                key={recordClass}
                onClick={() => {
                  setCreatingClass(recordClass);
                  setActiveClass(recordClass);
                  setSelected(null);
                  setSelectedRecord(null);
                  setSaveError(null);
                  setDeleteOutcome(null);
                  setLinkPromptRecordsToNewRecord(false);
                }}
              >
                New {recordClass}
              </button>
            ))}
          </header>

          {creatingClass ? (
            <section className="post-workbench-drawer">
              <h3>New {creatingClass}</h3>
              <label style={{ display: "block", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={linkPromptRecordsToNewRecord}
                  onChange={(event) =>
                    setLinkPromptRecordsToNewRecord(event.target.checked)
                  }
                />{" "}
                Link prompt cast/records to this new record
              </label>
              <RecordForm
                key={`${creatingClass}:${
                  linkPromptRecordsToNewRecord ? "prompt-links" : "blank-links"
                }`}
                recordClass={creatingClass}
                initial={initialRecordForSegment(
                  payload,
                  linkPromptRecordsToNewRecord,
                )}
                noteInsertion={noteInsertion}
                noteInsertionTargetKey={`new:${creatingClass}`}
                onSave={handleSave}
                onCancel={() => {
                  setCreatingClass(null);
                  setLinkPromptRecordsToNewRecord(false);
                  setSaveError(null);
                }}
                saveError={saveError}
              />
            </section>
          ) : selected ? (
            <section className="post-workbench-drawer">
              {selectedRecord ? (
                <>
                  <h3>{selectedRecord.title}</h3>
                  <RecordForm
                    recordClass={selected.recordClass}
                    initial={selectedRecord}
                    noteInsertion={noteInsertion}
                    noteInsertionTargetKey={`${selected.recordClass}:${selectedRecord.id}`}
                    onSave={handleSave}
                    onCancel={() => {
                      setSelected(null);
                      setSaveError(null);
                    }}
                    saveError={saveError}
                  />
                  <button type="button" onClick={handleDelete}>
                    Delete
                  </button>
                  {deleteOutcome &&
                  "outcome" in deleteOutcome &&
                  deleteOutcome.outcome === "blocked" ? (
                    <section
                      role="alert"
                      className="post-workbench-delete-block"
                      aria-labelledby="post-workbench-delete-block-heading"
                    >
                      <h4 id="post-workbench-delete-block-heading">
                        Resolve these references first.
                      </h4>
                      {deleteOutcome.referrers.map((referrer) => (
                        <RecordCard
                          key={`${referrer.recordClass}:${referrer.summary.id}`}
                          summary={referrer.summary}
                          recordClass={referrer.recordClass}
                          compact
                          onOpen={(id) => {
                            setSelected({
                              recordClass: referrer.recordClass,
                              id,
                            });
                            setActiveClass(referrer.recordClass);
                            setCreatingClass(null);
                            setLinkPromptRecordsToNewRecord(false);
                            setSaveError(null);
                            setDeleteOutcome(null);
                          }}
                        />
                      ))}
                      <details>
                        <summary>Repair: force delete this record</summary>
                        <p>
                          This removes the record despite live references and
                          writes a repair-log entry.
                        </p>
                        <button type="button" onClick={handleForceDelete}>
                          Force delete anyway
                        </button>
                      </details>
                    </section>
                  ) : null}
                  {deleteOutcome &&
                  "outcome" in deleteOutcome &&
                  deleteOutcome.outcome === "force_deleted" ? (
                    <p>Force-deleted at {deleteOutcome.auditEntry.deletedAt}.</p>
                  ) : null}
                </>
              ) : detailError ? (
                <p role="alert">Failed to load record: {detailError}</p>
              ) : (
                <p>Loading record...</p>
              )}
            </section>
          ) : (
            <section className="post-workbench-empty">
              <h3>{activeClass}</h3>
              <p>Select a candidate record or create a new post-segment record.</p>
            </section>
          )}
        </section>
      </section>
    </div>
  );
}
