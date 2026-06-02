import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  createRecord as apiCreate,
  listRecords as apiList,
  readRecord as apiRead,
  updateRecord as apiUpdate,
  type CreateResult,
} from "../api/records.js";
import { RecordCard } from "../components/RecordCard.js";
import { RecordForm } from "../components/RecordForm.js";
import type {
  ManualRecord,
  ManualRecordSummary,
} from "../types/manual-story.js";

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function CastAndProfiles() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get("id");

  const [summaries, setSummaries] = useState<ManualRecordSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [selectedRecord, setSelectedRecord] = useState<ManualRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [saveError, setSaveError] = useState<
    Exclude<CreateResult, { ok: true }> | null
  >(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (selectedId) next.id = selectedId;
    setSearchParams(next, { replace: true });
  }, [selectedId, setSearchParams]);

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setListError(null);
    apiList(worldSlug, msSlug, "cast", { includeArchived: true })
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
  }, [worldSlug, msSlug, saveError]);

  useEffect(() => {
    if (!worldSlug || !msSlug || !selectedId) {
      setSelectedRecord(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailError(null);
    apiRead(worldSlug, msSlug, "cast", selectedId)
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
  }, [worldSlug, msSlug, selectedId]);

  async function handleSave(
    record: ManualRecord,
    opts?: { overrideBrokenRefs?: boolean },
  ): Promise<boolean> {
    if (!worldSlug || !msSlug) return false;
    setSaveError(null);
    if (creating) {
      const result = await apiCreate(worldSlug, msSlug, "cast", record, opts);
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
        "cast",
        selectedId,
        record,
        opts,
      );
      if (result.ok) {
        setSelectedRecord(result.record);
        return true;
      }
      if (result.error !== "not_found") setSaveError(result);
      return false;
    }
    return false;
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <div
      className="manual-cast-page"
      style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 12 }}
    >
      <section aria-label="cast-list">
        <header
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>Cast & Profiles</h3>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
              setSelectedRecord(null);
              setSaveError(null);
            }}
          >
            New
          </button>
        </header>
        {summaries.length === 0 ? (
          listError ? (
            <p role="alert">Failed to load cast records: {listError}</p>
          ) : (
            <p>No cast records.</p>
          )
        ) : (
          <>
            {listError ? (
              <p role="alert">Failed to refresh cast records: {listError}</p>
            ) : null}
            {summaries.map((s) => (
              <RecordCard
                key={s.id}
                summary={s}
                onOpen={(id) => {
                  setSelectedId(id);
                  setCreating(false);
                  setSaveError(null);
                  setDetailError(null);
                }}
              />
            ))}
          </>
        )}
      </section>
      <section aria-label="cast-detail">
        {creating ? (
          <>
            <h3>New cast member</h3>
            <RecordForm
              recordClass="cast"
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
            <RecordForm
              recordClass="cast"
              initial={selectedRecord}
              onSave={handleSave}
              onCancel={() => setSelectedId(null)}
              saveError={saveError}
            />
          ) : detailError ? (
            <p role="alert">Failed to load cast record: {detailError}</p>
          ) : (
            <p>Loading…</p>
          )
        ) : (
          <p>Select a cast member or click New.</p>
        )}
      </section>
    </div>
  );
}
