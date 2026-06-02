import type {
  ManualRecordClass,
  ManualRecordSummary,
} from "../types/manual-story.js";

export interface RecordCardProps {
  summary: ManualRecordSummary;
  onOpen: (id: string) => void;
  recordClass?: ManualRecordClass;
  selected?: boolean;
  compact?: boolean;
  onSelect?: (id: string) => void;
  interactionRole?: "button" | "option";
}

const IMPORTANCE_COLOR: Record<ManualRecordSummary["importance"], string> = {
  low: "#9a9a9a",
  medium: "#2a82d6",
  high: "#d6822a",
  central: "#d62a40",
};

export function RecordCard(props: RecordCardProps) {
  const {
    summary,
    onOpen,
    recordClass,
    selected,
    compact = false,
    onSelect,
    interactionRole = "button",
  } = props;
  const activate = () => {
    if (onSelect) {
      onSelect(summary.id);
      return;
    }
    onOpen(summary.id);
  };
  return (
    <article
      className={`manual-record-card${selected ? " manual-record-card--selected" : ""}`}
      onClick={activate}
      style={{
        border: selected ? "2px solid #2a82d6" : "1px solid #ccc",
        borderRadius: 4,
        padding: compact ? 8 : 12,
        cursor: "pointer",
        marginBottom: compact ? 4 : 8,
        opacity: summary.active ? 1 : 0.55,
        background: selected ? "#eef6ff" : "white",
      }}
      role={interactionRole}
      tabIndex={0}
      aria-selected={interactionRole === "option" ? selected : undefined}
      aria-pressed={interactionRole === "button" && selected !== undefined ? selected : undefined}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
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
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          gap: "2px 8px",
          margin: "6px 0",
          fontSize: 12,
        }}
      >
        {recordClass ? (
          <>
            <dt style={{ fontWeight: 600 }}>Class</dt>
            <dd style={{ margin: 0 }}>{recordClass}</dd>
          </>
        ) : null}
        <dt style={{ fontWeight: 600 }}>Prompt</dt>
        <dd style={{ margin: 0 }}>{summary.prompt_visibility}</dd>
        {summary.involved_cast && summary.involved_cast.length > 0 ? (
          <>
            <dt style={{ fontWeight: 600 }}>Cast</dt>
            <dd style={{ margin: 0 }}>{summary.involved_cast.join(", ")}</dd>
          </>
        ) : null}
      </dl>
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
