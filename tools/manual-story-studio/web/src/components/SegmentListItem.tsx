export interface SegmentListItemProps {
  segmentId: string;
  title: string;
  wordCount: number;
  selected?: boolean;
  onSelect?: (segmentId: string) => void;
  onEdit: (segmentId: string) => void;
  onDelete: (segmentId: string) => void;
}

export function SegmentListItem({
  segmentId,
  title,
  wordCount,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
}: SegmentListItemProps) {
  const displayTitle = title.trim().length > 0 ? title : segmentId;

  return (
    <li
      id={segmentId}
      style={{
        listStyle: "none",
        border: "1px solid #ccc",
        background: selected ? "#eef" : "#fff",
        padding: 8,
      }}
    >
      <button
        type="button"
        onClick={() => onSelect?.(segmentId)}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          border: 0,
          background: "transparent",
          padding: 0,
          cursor: onSelect ? "pointer" : "default",
        }}
      >
        <strong>{displayTitle}</strong>
        <span style={{ display: "block", color: "#666" }}>{segmentId}</span>
        <span style={{ display: "block", color: "#666" }}>
          {wordCount} words
        </span>
      </button>
      <div
        role="toolbar"
        aria-label={`${segmentId} actions`}
        style={{ display: "flex", gap: 6, marginTop: 8 }}
      >
        <button type="button" onClick={() => onEdit(segmentId)}>
          Edit
        </button>
        <button type="button" onClick={() => onDelete(segmentId)}>
          Delete
        </button>
      </div>
    </li>
  );
}
