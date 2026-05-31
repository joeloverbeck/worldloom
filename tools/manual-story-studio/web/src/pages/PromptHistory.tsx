import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getPrompt,
  listPrompts,
  type PromptListEntry,
} from "../api/prompts.js";
import type { PromptRunSidecar } from "../types/manual-story.js";

interface PromptDetail {
  markdown: string;
  sidecar: PromptRunSidecar;
}

export function PromptHistory() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const navigate = useNavigate();

  const [prompts, setPrompts] = useState<PromptListEntry[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPrompts(worldSlug, msSlug)
      .then((result) => {
        if (!cancelled) setPrompts(result.prompts);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "prompt_history_load_failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug]);

  async function loadDetail(promptId: string): Promise<PromptDetail | null> {
    if (!worldSlug || !msSlug) return null;
    setDetailLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await getPrompt(worldSlug, msSlug, promptId);
      if (!result) {
        setDetail(null);
        setSelectedPromptId(promptId);
        setNotice(`Prompt ${promptId} no longer exists.`);
        return null;
      }
      setDetail(result);
      setSelectedPromptId(promptId);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "prompt_detail_load_failed");
      return null;
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleView(promptId: string): Promise<void> {
    await loadDetail(promptId);
  }

  async function handleReuse(promptId: string): Promise<void> {
    if (!worldSlug || !msSlug) return;
    const result =
      detail?.sidecar.id === promptId ? detail : await loadDetail(promptId);
    if (!result) return;
    navigate(`/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`, {
      state: {
        moment_directive: result.sidecar.moment_directive,
        included_cast: result.sidecar.included_cast,
        included_records: result.sidecar.included_records,
      },
    });
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <section
      aria-labelledby="prompt-history-heading"
      style={{ display: "grid", gap: 16 }}
    >
      <header>
        <h2 id="prompt-history-heading">Prompt History</h2>
        <p style={{ margin: 0, color: "#666" }}>
          Saved prompts and the manuscript segments produced from them.
        </p>
      </header>

      {loading ? <p>Loading prompts...</p> : null}
      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}

      {prompts.length === 0 && !loading ? (
        <p>No saved prompts yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {prompts.map((prompt) => (
            <article
              key={prompt.id}
              aria-labelledby={`${prompt.id}-heading`}
              style={{ border: "1px solid #ccc", padding: 12 }}
            >
              <header>
                <h3 id={`${prompt.id}-heading`} style={{ marginTop: 0 }}>
                  {prompt.id}
                </h3>
                <p style={{ margin: 0, color: "#666" }}>
                  {prompt.created_at}
                </p>
              </header>
              <p>{prompt.moment_directive_snippet || "No directive snippet."}</p>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#666" }}>
                Template:{" "}
                {prompt.selected_template ? (
                  <span
                    style={{
                      background: "#dde",
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}
                  >
                    {prompt.selected_template}
                  </span>
                ) : (
                  <em>(none)</em>
                )}
              </p>
              <div>
                <strong>Segments</strong>
                {prompt.linked_segments.length === 0 ? (
                  <p>No segments produced yet.</p>
                ) : (
                  <ul>
                    {prompt.linked_segments.map((segmentId) => (
                      <li key={segmentId}>
                        <Link
                          to={`/worlds/${worldSlug}/manual-stories/${msSlug}/manuscript#${segmentId}`}
                        >
                          {segmentId}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div
                role="toolbar"
                aria-label={`${prompt.id} actions`}
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
              >
                <button
                  type="button"
                  onClick={() => void handleView(prompt.id)}
                  disabled={detailLoading}
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => void handleReuse(prompt.id)}
                  disabled={detailLoading}
                >
                  Reuse Prompt
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedPromptId ? (
        <section aria-labelledby="prompt-detail-heading">
          <h3 id="prompt-detail-heading">{selectedPromptId} Detail</h3>
          {detailLoading ? <p>Loading prompt...</p> : null}
          {detail ? (
            <div style={{ display: "grid", gap: 12 }}>
              <dl>
                <dt>Created</dt>
                <dd>{detail.sidecar.created_at}</dd>
                <dt>Included cast</dt>
                <dd>{detail.sidecar.included_cast.join(", ") || "None"}</dd>
                <dt>Included records</dt>
                <dd>{detail.sidecar.included_records.join(", ") || "None"}</dd>
                <dt>Prompt hash</dt>
                <dd>
                  <code>{detail.sidecar.prompt_sha256}</code>
                </dd>
              </dl>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  border: "1px solid #ccc",
                  padding: 12,
                  maxHeight: "50vh",
                  overflow: "auto",
                }}
              >
                {detail.markdown}
              </pre>
            </div>
          ) : notice ? null : (
            <p>Prompt detail unavailable.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
