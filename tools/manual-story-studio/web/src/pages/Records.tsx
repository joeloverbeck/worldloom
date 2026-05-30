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

  const [activeClass, setActiveClass] = useState<ManualRecordClass>(initialClass);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [summaries, setSummaries] = useState<ManualRecordSummary[]>([]);
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

  // Sync URL
  useEffect(() => {
    const next: Record<string, string> = { class: activeClass };
    if (selectedId) next.id = selectedId;
    setSearchParams(next, { replace: true });
  }, [activeClass, selectedId, setSearchParams]);

  // Load list
  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    apiList(worldSlug, msSlug, activeClass, { includeArchived })
      .then((records) => {
        if (!cancelled) setSummaries(records);
      })
      .catch(() => {
        if (!cancelled) setSummaries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, activeClass, includeArchived, deleteOutcome, saveError]);

  // Load detail when selected
  useEffect(() => {
    if (!worldSlug || !msSlug || !selectedId) {
      setSelectedRecord(null);
      return;
    }
    let cancelled = false;
    apiRead(worldSlug, msSlug, activeClass, selectedId)
      .then((rec) => {
        if (!cancelled) setSelectedRecord(rec);
      })
      .catch(() => {
        if (!cancelled) setSelectedRecord(null);
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
      return true;
    });
  }, [summaries, tagFilter, importanceFilter]);

  async function handleSave(
    record: ManualRecord,
    opts?: { overrideBrokenRefs?: boolean },
  ) {
    if (!worldSlug || !msSlug) return;
    setSaveError(null);
    if (creating) {
      const result = await apiCreate(worldSlug, msSlug, activeClass, record, opts);
      if (result.ok) {
        setCreating(false);
        setSelectedId(result.id);
      } else {
        setSaveError(result);
      }
      return;
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
      } else if (result.error !== "not_found") {
        setSaveError(result);
      }
    }
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
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />{" "}
          include archived
        </label>
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
        {filteredSummaries.length === 0 ? (
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
              deleteOutcome.outcome === "inactive_default" ? (
                <section role="alert" style={{ background: "#ffe", padding: 8 }}>
                  <p>
                    Record was archived (active:false) because it has referrers:{" "}
                    {deleteOutcome.referrers.map((r) => r.id).join(", ")}
                  </p>
                  <button type="button" onClick={handleForceDelete}>
                    Force delete anyway
                  </button>
                </section>
              ) : null}
              {deleteOutcome &&
              "outcome" in deleteOutcome &&
              deleteOutcome.outcome === "force_deleted" ? (
                <p>Force-deleted at {deleteOutcome.auditEntry.deletedAt}.</p>
              ) : null}
            </>
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
