import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { saveSegment } from "../api/segments.js";

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}

export function PasteProse() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();

  const [prose, setProse] = useState("");
  const [title, setTitle] = useState("");
  const [authorNote, setAuthorNote] = useState("");
  const [promptId, setPromptId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = useMemo(() => countWords(prose), [prose]);

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
      await saveSegment(worldSlug, msSlug, request);
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_save_failed");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard(): void {
    setProse("");
    setTitle("");
    setAuthorNote("");
    setPromptId("");
    setError(null);
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
        <h2 id="paste-prose-heading">Paste Prose</h2>
      </header>

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
            disabled={saving || prose.trim().length === 0}
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
    </section>
  );
}
