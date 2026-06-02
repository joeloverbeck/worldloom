import type { ManualRecordSummary } from "../types/manual-story.js";

export interface RecordCardProps {
  summary: ManualRecordSummary;
  onOpen: (id: string) => void;
}

const IMPORTANCE_COLOR: Record<ManualRecordSummary["importance"], string> = {
  low: "#9a9a9a",
  medium: "#2a82d6",
  high: "#d6822a",
  central: "#d62a40",
};

export function RecordCard(props: RecordCardProps) {
  const { summary, onOpen } = props;
  return (
    <article
      className="manual-record-card"
      onClick={() => onOpen(summary.id)}
      style={{
        border: "1px solid #ccc",
        borderRadius: 4,
        padding: 12,
        cursor: "pointer",
        marginBottom: 8,
        opacity: summary.active ? 1 : 0.55,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(summary.id);
        }
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>{summary.title}</h3>
        <span
          aria-label={`importance:${summary.importance}`}
          style={{
            background: IMPORTANCE_COLOR[summary.importance],
            color: "white",
            borderRadius: 4,
            padding: "1px 6px",
            fontSize: 11,
          }}
        >
          {summary.importance}
        </span>
      </header>
      <p style={{ margin: "4px 0" }}>
        <span className="id-subscript">
          {summary.id} {summary.active ? "" : "(archived)"}
        </span>
      </p>
      {summary.summary ? (
        <p style={{ margin: "4px 0" }}>{summary.summary}</p>
      ) : null}
      {summary.tags.length > 0 ? (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
          {summary.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: "#eee",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 11,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
