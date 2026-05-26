import type { RecordCard } from '../../api/client';

interface CompactLineProps {
  recordCard: RecordCard;
}

export function renderCompactLine(recordCard: RecordCard): JSX.Element {
  return (
    <span className="record-card__summary">
      {recordCard.recordId} · {recordCard.recordClass}
    </span>
  );
}

export function CompactLine({ recordCard }: CompactLineProps): JSX.Element {
  return renderCompactLine(recordCard);
}
