import type { RecordCard } from '../../api/client';
import { CompactLine } from './RecordCardRenderers';

interface RecordCardCompactProps {
  recordCard: RecordCard;
  onExpand?: () => void;
}

function visibleChipValue(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

export function RecordCardCompact({ recordCard, onExpand }: RecordCardCompactProps): JSX.Element {
  return (
    <article
      className="record-card record-card--compact"
      aria-labelledby={`record-card-${recordCard.recordId}`}
      data-xray-record-id={recordCard.recordId}
      tabIndex={-1}
    >
      <div className="record-card__header">
        <span className="record-card__class">{recordCard.recordClass}</span>
        <h4 className="record-card__title" id={`record-card-${recordCard.recordId}`}>
          <CompactLine recordCard={recordCard} />
        </h4>
      </div>
      {recordCard.summaryLine ? <p className="record-card__line">{recordCard.summaryLine}</p> : null}
      <div className="record-card__chips" aria-label={`${recordCard.recordId} summary chips`}>
        {visibleChipValue(recordCard.status) ? <span className="record-chip">Status: {recordCard.status}</span> : null}
        {visibleChipValue(recordCard.visibility) ? (
          <span className="record-chip">Visibility: {recordCard.visibility}</span>
        ) : null}
        {visibleChipValue(recordCard.confidence) ? (
          <span className="record-chip">Confidence: {recordCard.confidence}</span>
        ) : null}
        {visibleChipValue(recordCard.urgency) ? <span className="record-chip">Urgency: {recordCard.urgency}</span> : null}
        {recordCard.provenance.createdAtPage ? (
          <span className="record-chip">Created at {recordCard.provenance.createdAtPage}</span>
        ) : null}
        {recordCard.links.length > 0 ? <span className="record-chip">{recordCard.links.length} related</span> : null}
      </div>
      {onExpand ? (
        <button className="record-card__expand" type="button" onClick={onExpand}>
          Expand
        </button>
      ) : null}
    </article>
  );
}
