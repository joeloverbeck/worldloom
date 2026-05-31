import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  editSegment,
  readSegment,
  saveSegment,
} from "../api/segments.js";
import { StateUpdateChecklist } from "../components/StateUpdateChecklist.js";
import type { StateUpdateChecklistPayload } from "../types/manual-story.js";

interface PasteProseNavState {
  prompt_id?: string | null;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}

export function PasteProse() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as PasteProseNavState;

  const editSegmentId = searchParams.get("edit");
  const initialPromptId =
    navState.prompt_id ?? searchParams.get("prompt_id") ?? "";

  const [prose, setProse] = useState("");
  const [title, setTitle] = useState("");
  const [authorNote, setAuthorNote] = useState("");
  const [promptId, setPromptId] = useState(initialPromptId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklistPayload, setChecklistPayload] =
    useState<StateUpdateChecklistPayload | null>(null);

  const wordCount = useMemo(() => countWords(prose), [prose]);
  const isEditMode = editSegmentId != null && editSegmentId.trim().length > 0;

  useEffect(() => {
    if (!worldSlug || !msSlug || !isEditMode || !editSegmentId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    readSegment(worldSlug, msSlug, editSegmentId)
      .then((segment) => {
        if (cancelled) return;
        if (!segment) {
          setError(`Segment ${editSegmentId} was not found.`);
          return;
        }
        setProse(segment.body);
        setTitle(segment.sidecar.title);
        setAuthorNote(segment.sidecar.author_note);
        setPromptId(segment.sidecar.prompt_id ?? "");
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "segment_load_failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, isEditMode, editSegmentId]);

  async function handleSave(): Promise<void> {
    if (!worldSlug || !msSlug) return;
    setSaving(true);
    setError(null);
    try {
      const request = {
        prose,
        title,
        author_note: authorNote,
        prompt_id: promptId.trim().length > 0 ? promptId.trim() : null,
      };
      const response =
        isEditMode && editSegmentId
          ? await editSegment(worldSlug, msSlug, editSegmentId, request)
          : await saveSegment(worldSlug, msSlug, request);
      setChecklistPayload(response.checklist_payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_save_failed");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard(): void {
    if (!worldSlug || !msSlug) return;
    navigate(`/worlds/${worldSlug}/manual-stories/${msSlug}/dashboard`);
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <section
      aria-labelledby="paste-prose-heading"
      style={{ display: "grid", gap: 16 }}
    >
      <header>
        <h2 id="paste-prose-heading">
          {isEditMode ? "Edit Segment" : "Paste Prose"}
        </h2>
        {isEditMode ? (
          <p style={{ margin: 0, color: "#666" }}>{editSegmentId}</p>
        ) : null}
      </header>

      {loading ? <p>Loading segment...</p> : null}

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontWeight: 600 }}>Segment title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Defaults to the first sentence"
        />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontWeight: 600 }}>Prompt ID</span>
        <input
          type="text"
          value={promptId}
          onChange={(e) => setPromptId(e.target.value)}
          placeholder="PROMPT-1"
        />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontWeight: 600 }}>Author note</span>
        <input
          type="text"
          value={authorNote}
          onChange={(e) => setAuthorNote(e.target.value)}
          placeholder="Optional note for this segment"
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>Prose</span>
        <textarea
          aria-label="pasted prose"
          rows={24}
          value={prose}
          onChange={(e) => setProse(e.target.value)}
          style={{
            width: "100%",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: 1.5,
            resize: "vertical",
          }}
          placeholder="Paste or draft the next manuscript segment here."
        />
      </label>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span aria-live="polite">{wordCount} words</span>
        <div role="toolbar" aria-label="segment actions" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={handleDiscard} disabled={saving}>
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || prose.trim().length === 0}
          >
            {saving ? "Saving..." : "Save Segment"}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}

      {checklistPayload ? (
        <StateUpdateChecklist
          payload={checklistPayload}
          onClose={() => setChecklistPayload(null)}
        />
      ) : null}
    </section>
  );
}
