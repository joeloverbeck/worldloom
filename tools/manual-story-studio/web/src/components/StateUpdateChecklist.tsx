import { useNavigate, useParams } from "react-router-dom";

import type {
  ManualRecordClass,
  StateUpdateChecklistPayload,
} from "../types/manual-story.js";

export interface StateUpdateChecklistProps {
  payload: StateUpdateChecklistPayload;
  onClose: () => void;
}

export function StateUpdateChecklist({
  payload,
  onClose,
}: StateUpdateChecklistProps) {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const navigate = useNavigate();

  function handleReview(recordClass: ManualRecordClass) {
    if (!worldSlug || !msSlug) return;

    const searchParams = new URLSearchParams({ class: recordClass });
    if (payload.involved_cast.length > 0) {
      searchParams.set("cast", payload.involved_cast.join(","));
    }

    navigate(
      `/worlds/${encodeURIComponent(worldSlug)}/manual-stories/${encodeURIComponent(
        msSlug,
      )}/records?${searchParams.toString()}`,
    );
  }

  return (
    <div
      role="dialog"
      aria-label="state-update-checklist"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.34)",
        display: "grid",
        placeItems: "center",
        zIndex: 20,
        padding: 16,
      }}
    >
      <section
        style={{
          width: "min(760px, 100%)",
          maxHeight: "min(720px, calc(100vh - 32px))",
          overflow: "auto",
          background: "white",
          border: "1px solid #bbb",
          borderRadius: 6,
          padding: 20,
          boxShadow: "0 12px 28px rgba(0, 0, 0, 0.22)",
        }}
      >
        <header style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 8px" }}>
            Review record categories after this segment
          </h2>
          <p style={{ margin: 0 }}>{payload.disclaimer}</p>
        </header>

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {payload.entries.map((entry) => (
            <li
              key={entry.record_class}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(140px, 1fr) minmax(170px, 1fr) auto",
                gap: 12,
                alignItems: "center",
                borderTop: "1px solid #ddd",
                padding: "10px 0",
              }}
            >
              <strong>{entry.record_class}</strong>
              <span style={{ color: "#555" }}>
                {entry.cast_referencing_count} referencing involved cast (
                {entry.total_records} total)
              </span>
              <button
                type="button"
                onClick={() => handleReview(entry.record_class)}
              >
                Review {entry.cast_referencing_count} records
              </button>
            </li>
          ))}
        </ul>

        <footer style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose}>
            Skip review
          </button>
        </footer>
      </section>
    </div>
  );
}
