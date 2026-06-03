import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  createRecord as apiCreate,
  deleteRecord as apiDelete,
  listRecords as apiList,
  readRecord as apiRead,
  updateRecord as apiUpdate,
  type CreateResult,
  type DeleteResult,
} from "../api/records.js";
import { RecordCard } from "../components/RecordCard.js";
import { RecordForm } from "../components/RecordForm.js";
import {
  MANUAL_RECORD_CLASSES,
  type ManualRecord,
  type ManualRecordClass,
  type ManualRecordSummary,
} from "../types/manual-story.js";

function isManualRecordClass(value: string | null): value is ManualRecordClass {
  if (!value) return false;
  return (MANUAL_RECORD_CLASSES as readonly string[]).includes(value);
}

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function Records() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClass =
    isManualRecordClass(searchParams.get("class"))
      ? (searchParams.get("class") as ManualRecordClass)
      : "cast";
  const initialId = searchParams.get("id");
  const castFilter = searchParams.get("cast") ?? "";

  const [activeClass, setActiveClass] = useState<ManualRecordClass>(initialClass);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [summaries, setSummaries] = useState<ManualRecordSummary[]>([]);
  const [castFilteredIds, setCastFilteredIds] = useState<Set<string> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [selectedRecord, setSelectedRecord] = useState<ManualRecord | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [saveError, setSaveError] = useState<
    Exclude<CreateResult, { ok: true }> | null
  >(null);
  const [tagFilter, setTagFilter] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<string[]>([]);
  const [deleteOutcome, setDeleteOutcome] = useState<DeleteResult | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [castFilterError, setCastFilterError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const castFilterIds = useMemo(
    () =>
      castFilter
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    [castFilter],
  );

  // Sync URL
  useEffect(() => {
    const next: Record<string, string> = { class: activeClass };
    if (selectedId) next.id = selectedId;
    if (castFilterIds.length > 0) next.cast = castFilterIds.join(",");
    setSearchParams(next, { replace: true });
  }, [activeClass, selectedId, castFilterIds, setSearchParams]);

  // Load list
  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setListError(null);
    apiList(worldSlug, msSlug, activeClass, { includeInactive })
      .then((records) => {
        if (!cancelled) {
          setSummaries(records);
          setListError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSummaries([]);
          setListError(loadErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, activeClass, includeInactive, deleteOutcome, saveError]);

  // Apply optional cast prefilter from ?cast=mchar-1,mchar-2.
  useEffect(() => {
    if (!worldSlug || !msSlug || castFilterIds.length === 0) {
      setCastFilteredIds(null);
      setCastFilterError(null);
      return;
    }

    let cancelled = false;
    setCastFilterError(null);
    const castSet = new Set(castFilterIds);
    Promise.all(
      summaries.map(async (summary) => {
        const record = await apiRead(worldSlug, msSlug, activeClass, summary.id);
        const matches =
          record?.refs.characters.some((id) => castSet.has(id)) ?? false;
        return matches ? summary.id : null;
      }),
    )
      .then((ids) => {
        if (!cancelled) {
          setCastFilteredIds(new Set(ids.filter((id): id is string => id != null)));
          setCastFilterError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCastFilteredIds(new Set());
          setCastFilterError(loadErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, activeClass, summaries, castFilterIds]);

  // Load detail when selected
  useEffect(() => {
    if (!worldSlug || !msSlug || !selectedId) {
      setSelectedRecord(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailError(null);
    apiRead(worldSlug, msSlug, activeClass, selectedId)
      .then((rec) => {
        if (!cancelled) {
          setSelectedRecord(rec);
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
  }, [worldSlug, msSlug, activeClass, selectedId]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (tagFilter.trim() !== "" && !s.tags.includes(tagFilter.trim())) {
        return false;
      }
      if (
        importanceFilter.length > 0 &&
        !importanceFilter.includes(s.importance)
      ) {
        return false;
      }
      if (castFilteredIds && !castFilteredIds.has(s.id)) {
        return false;
      }
      return true;
    });
  }, [summaries, tagFilter, importanceFilter, castFilteredIds]);

  async function handleSave(
    record: ManualRecord,
    opts?: { overrideBrokenRefs?: boolean },
  ): Promise<boolean> {
    if (!worldSlug || !msSlug) return false;
    setSaveError(null);
    if (creating) {
      const result = await apiCreate(worldSlug, msSlug, activeClass, record, opts);
      if (result.ok) {
        setCreating(false);
        setSelectedId(result.id);
        return true;
      } else {
        setSaveError(result);
        return false;
      }
    }
    if (selectedId) {
      const result = await apiUpdate(
        worldSlug,
        msSlug,
        activeClass,
        selectedId,
        record,
        opts,
      );
      if (result.ok) {
        setSelectedRecord(result.record);
        return true;
      } else if (result.error !== "not_found") {
        setSaveError(result);
      }
      return false;
    }
    return false;
  }

  async function handleDelete() {
    if (!worldSlug || !msSlug || !selectedId) return;
    const result = await apiDelete(worldSlug, msSlug, activeClass, selectedId);
    setDeleteOutcome(result);
    if ("outcome" in result && result.outcome === "hard_deleted") {
      setSelectedId(null);
    }
  }

  async function handleForceDelete() {
    if (!worldSlug || !msSlug || !selectedId) return;
    const result = await apiDelete(worldSlug, msSlug, activeClass, selectedId, {
      force: true,
      mode: "repair",
    });
    setDeleteOutcome(result);
    if ("outcome" in result && result.outcome === "force_deleted") {
      setSelectedId(null);
    }
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <div
      className="manual-records-page"
      style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 12 }}
    >
      <aside aria-label="record-class-rail">
        <h3>Classes</h3>
        <label style={{ display: "block", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />{" "}
          include inactive
        </label>
        <p style={{ color: "#666", fontSize: 12, margin: "0 0 8px" }}>
          Inactive = kept for reference, hidden from normal selection. Deleted =
          file gone.
        </p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {MANUAL_RECORD_CLASSES.map((cls) => (
            <li key={cls}>
              <button
                type="button"
                onClick={() => {
                  setActiveClass(cls);
                  setSelectedId(null);
                  setCreating(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: cls === activeClass ? "#dde" : "transparent",
                  border: "1px solid #ccc",
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                {cls}{" "}
                <span style={{ color: "#666" }}>
                  ({cls === activeClass ? summaries.length : ""})
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section aria-label="record-grid">
        <header
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
              setSelectedRecord(null);
              setSaveError(null);
            }}
          >
            New Record
          </button>
          <input
            aria-label="tag-filter"
            type="text"
            placeholder="tag filter"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
          {castFilterIds.length > 0 ? (
            <span
              aria-label="cast-filter"
              style={{
                border: "1px solid #ccc",
                borderRadius: 4,
                padding: "2px 6px",
                fontSize: 12,
              }}
            >
              cast: {castFilterIds.join(", ")}
            </span>
          ) : null}
          <fieldset style={{ display: "flex", gap: 4, border: "none", padding: 0 }}>
            {(["low", "medium", "high", "central"] as const).map((imp) => (
              <label key={imp}>
                <input
                  type="checkbox"
                  checked={importanceFilter.includes(imp)}
                  onChange={(e) => {
                    setImportanceFilter(
                      e.target.checked
                        ? [...importanceFilter, imp]
                        : importanceFilter.filter((x) => x !== imp),
                    );
                  }}
                />{" "}
                {imp}
              </label>
            ))}
          </fieldset>
        </header>
        {listError ? (
          <p role="alert">Failed to load records: {listError}</p>
        ) : castFilterError ? (
          <p role="alert">Failed to apply cast filter: {castFilterError}</p>
        ) : filteredSummaries.length === 0 ? (
          <p>No records.</p>
        ) : (
          filteredSummaries.map((s) => (
            <RecordCard
              key={s.id}
              summary={s}
              onOpen={(id) => {
                setSelectedId(id);
                setCreating(false);
                setSaveError(null);
                setDeleteOutcome(null);
                setDetailError(null);
              }}
            />
          ))
        )}
      </section>
      <section aria-label="record-detail">
        {creating ? (
          <>
            <h3>New {activeClass}</h3>
            <RecordForm
              recordClass={activeClass}
              onSave={handleSave}
              onCancel={() => {
                setCreating(false);
                setSaveError(null);
              }}
              saveError={saveError}
            />
          </>
        ) : selectedId ? (
          selectedRecord ? (
            <>
              <h3>{selectedRecord.title}</h3>
              <RecordForm
                recordClass={activeClass}
                initial={selectedRecord}
                onSave={handleSave}
                onCancel={() => setSelectedId(null)}
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
                  aria-labelledby="record-delete-blocked-heading"
                  style={{
                    background: "#fff7e6",
                    border: "1px solid #d6822a",
                    padding: 10,
                    marginTop: 8,
                  }}
                >
                  <h4 id="record-delete-blocked-heading" style={{ margin: "0 0 8px" }}>
                    Resolve these references first.
                  </h4>
                  <div>
                    {deleteOutcome.referrers.map((referrer) => (
                      <RecordCard
                        key={`${referrer.recordClass}:${referrer.summary.id}`}
                        summary={referrer.summary}
                        recordClass={referrer.recordClass}
                        compact
                        onOpen={(id) => {
                          setActiveClass(referrer.recordClass);
                          setSelectedId(id);
                          setCreating(false);
                          setSaveError(null);
                          setDeleteOutcome(null);
                          setDetailError(null);
                        }}
                      />
                    ))}
                  </div>
                  <details style={{ marginTop: 8 }}>
                    <summary>Repair: force delete this record</summary>
                    <p>
                      This removes the record despite live references and writes a
                      repair-log entry.
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
            <p>Loading record…</p>
          )
        ) : (
          <p>Select a record or click New Record.</p>
        )}
      </section>
    </div>
  );
}
