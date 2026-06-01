export interface SegmentListItemProps {
  segmentId: string;
  title: string;
  wordCount: number;
  selected?: boolean;
  onSelect?: (segmentId: string) => void;
}

export function SegmentListItem({
  segmentId,
  title,
  wordCount,
  selected = false,
  onSelect,
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
    </li>
  );
}
