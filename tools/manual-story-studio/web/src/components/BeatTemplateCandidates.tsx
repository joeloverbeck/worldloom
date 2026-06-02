import { useEffect, useState } from "react";

import { getCandidates } from "../api/beat-templates.js";
import type {
  BeatTemplateCandidate,
  CandidateRequestBody,
} from "../types/manual-story.js";

export interface BeatTemplateCandidatesProps {
  worldSlug: string;
  msSlug: string;
  candidateInput: CandidateRequestBody;
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
}

export function BeatTemplateCandidates(props: BeatTemplateCandidatesProps) {
  const { worldSlug, msSlug, candidateInput, selectedTemplateId, onSelect } =
    props;
  const [candidates, setCandidates] = useState<BeatTemplateCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch when relevant inputs change. The request shape is small,
  // so a refetch is cheap; the filter pipeline is pure on the backend.
  const requestKey = JSON.stringify({
    moment_directive: candidateInput.moment_directive,
    selected_cast: [...candidateInput.selected_cast].sort(),
    optional_move_family: candidateInput.optional_move_family,
    optional_tags: candidateInput.optional_tags
      ? [...candidateInput.optional_tags].sort()
      : undefined,
    optional_location: candidateInput.optional_location,
    optional_desired_pressure_type: candidateInput.optional_desired_pressure_type,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCandidates(worldSlug, msSlug, candidateInput)
      .then((cs) => {
        if (!cancelled) setCandidates(cs);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldSlug, msSlug, requestKey]);

  return (
    <section aria-label="beat-template-candidates">
      <h4>Beat template</h4>
      <div
        style={{
          border: selectedTemplateId === null ? "2px solid #44a" : "1px solid #ccc",
          padding: 8,
          marginBottom: 8,
          borderRadius: 4,
        }}
      >
        <strong>No template</strong>
        <p style={{ fontSize: 12, color: "#666", margin: "4px 0" }}>
          Compose the prompt without a beat-template guidance section.
        </p>
        {selectedTemplateId === null ? (
          <span style={{ color: "#44a", fontWeight: 600 }}>Selected ✓</span>
        ) : (
          <button type="button" onClick={() => onSelect(null)}>
            Use no template
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          Failed to load candidates: {error}
        </p>
      ) : null}
      {loading ? <p>Loading candidates…</p> : null}
      {!loading && candidates.length === 0 ? (
        <p style={{ color: "#666" }}>
          <em>
            No matching beat templates. Create one in the Beat Templates page,
            or compose without a template.
          </em>
        </p>
      ) : null}
      {candidates.map((c) => (
        <article
          key={c.template.id}
          aria-label={`candidate-${c.template.id}`}
          style={{
            border:
              selectedTemplateId === c.template.id
                ? "2px solid #44a"
                : "1px solid #ccc",
            padding: 8,
            marginBottom: 8,
            borderRadius: 4,
          }}
        >
          <header style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <strong>{c.template.title || c.template.id}</strong>
            <span
              style={{
                background: "#dde",
                padding: "2px 6px",
                fontSize: 11,
                borderRadius: 3,
              }}
            >
              {c.template.classification.move_family}
            </span>
            <span
              style={{
                background: "#e8f4e8",
                padding: "2px 6px",
                fontSize: 11,
                borderRadius: 3,
              }}
            >
              {c.template.pressure_type}
            </span>
            <span
              style={{
                background: "#eef0ff",
                padding: "2px 6px",
                fontSize: 11,
                borderRadius: 3,
              }}
            >
              {c.template.turn_type}
            </span>
            <span style={{ color: "#666", fontSize: 12 }}>
              {c.template.beat_guidance.length} beat
              {c.template.beat_guidance.length === 1 ? "" : "s"}
            </span>
            {c.advisory_flags.recently_used ? (
              <span
                aria-label="recently-used-advisory"
                style={{
                  background: "#fed",
                  padding: "2px 6px",
                  fontSize: 11,
                  borderRadius: 3,
                }}
              >
                Recently used
                {c.advisory_flags.recently_used_at_segment
                  ? ` at ${c.advisory_flags.recently_used_at_segment}`
                  : ""}
              </span>
            ) : null}
          </header>
          {c.template.preconditions_text.trim().length > 0 ? (
            <p
              title={c.template.preconditions_text}
              style={{
                color: "#555",
                fontSize: 12,
                margin: "4px 0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.template.preconditions_text}
            </p>
          ) : null}
          {c.why_suggested.length > 0 ? (
            <ul style={{ fontSize: 12, color: "#444", margin: "4px 0" }}>
              {c.why_suggested.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
          <details style={{ margin: "6px 0" }}>
            <summary>Details</summary>
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              {c.template.preconditions_text.trim().length > 0 ? (
                <p style={{ margin: 0 }}>
                  <strong>Preconditions:</strong> {c.template.preconditions_text}
                </p>
              ) : null}
              {c.template.stop_after.trim().length > 0 ? (
                <p style={{ margin: 0 }}>
                  <strong>Stop after:</strong> {c.template.stop_after}
                </p>
              ) : null}
              {c.template.expected_state_review.length > 0 ? (
                <p style={{ margin: 0 }}>
                  <strong>After prose, review:</strong>{" "}
                  {c.template.expected_state_review.map((cls) => (
                    <span
                      key={cls}
                      style={{
                        background: "#eee",
                        borderRadius: 3,
                        display: "inline-block",
                        fontSize: 11,
                        marginRight: 4,
                        padding: "1px 5px",
                      }}
                    >
                      {cls}
                    </span>
                  ))}
                </p>
              ) : null}
              {c.template.do_not_resolve.length > 0 ? (
                <section>
                  <strong>Do not resolve</strong>
                  <ul style={{ margin: "4px 0" }}>
                    {c.template.do_not_resolve.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {c.template.anti_patterns.length > 0 ? (
                <section>
                  <strong>Anti-patterns</strong>
                  <ul style={{ margin: "4px 0" }}>
                    {c.template.anti_patterns.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </details>
          {selectedTemplateId === c.template.id ? (
            <div>
              <span style={{ color: "#44a", fontWeight: 600 }}>Selected ✓</span>{" "}
              <button type="button" onClick={() => onSelect(null)}>
                Skip
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => onSelect(c.template.id)}>
              Use this template
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
