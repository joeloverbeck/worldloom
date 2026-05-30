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

  useEffect(() => {
    const next: Record<string, string> = {};
    if (selectedId) next.id = selectedId;
    setSearchParams(next, { replace: true });
  }, [selectedId, setSearchParams]);

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    apiList(worldSlug, msSlug, "cast", { includeArchived: true })
      .then((records) => {
        if (!cancelled) setSummaries(records);
      })
      .catch(() => {
        if (!cancelled) setSummaries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, saveError]);

  useEffect(() => {
    if (!worldSlug || !msSlug || !selectedId) {
      setSelectedRecord(null);
      return;
    }
    let cancelled = false;
    apiRead(worldSlug, msSlug, "cast", selectedId)
      .then((rec) => {
        if (!cancelled) setSelectedRecord(rec);
      })
      .catch(() => {
        if (!cancelled) setSelectedRecord(null);
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, selectedId]);

  async function handleSave(
    record: ManualRecord,
    opts?: { overrideBrokenRefs?: boolean },
  ) {
    if (!worldSlug || !msSlug) return;
    setSaveError(null);
    if (creating) {
      const result = await apiCreate(worldSlug, msSlug, "cast", record, opts);
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
        "cast",
        selectedId,
        record,
        opts,
      );
      if (result.ok) setSelectedRecord(result.record);
      else if (result.error !== "not_found") setSaveError(result);
    }
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
          <p>No cast records.</p>
        ) : (
          summaries.map((s) => (
            <RecordCard
              key={s.id}
              summary={s}
              onOpen={(id) => {
                setSelectedId(id);
                setCreating(false);
                setSaveError(null);
              }}
            />
          ))
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
