import { PgTick } from './PgTick';

// Flattened props (rather than an `UnscenedRunTimelineSegment`) so this card is
// reusable by the unscened-range route in SPEC97STOEXPSCE-007, whose payload is
// an `UnscenedRange`, not a timeline segment.
interface UnscenedRunCardProps {
  pageIds: string[];
  startPageId: string;
  endPageId: string;
  onSelectPage: (pageId: string) => void;
  focused?: boolean;
}

export function UnscenedRunCard({
  pageIds,
  startPageId,
  endPageId,
  onSelectPage,
  focused = false,
}: UnscenedRunCardProps): JSX.Element {
  return (
    <article
      className={`timeline-segment unscened-run${focused ? ' timeline-segment--focused' : ''}`}
      aria-label={`Unscened run ${startPageId}–${endPageId}`}
    >
      <header className="unscened-run__header">
        <h3 className="unscened-run__title">Unscened run</h3>
        <span className="unscened-run__count" data-testid="unscened-run-count">
          {pageIds.length} {pageIds.length === 1 ? 'page' : 'pages'}
        </span>
      </header>
      <p className="unscened-run__range">
        {startPageId} → {endPageId}
      </p>
      <ol className="pg-tick-row" aria-label={`Pages in unscened run ${startPageId}–${endPageId}`}>
        {pageIds.map((pageId) => (
          <li key={pageId}>
            <PgTick pageId={pageId} onSelect={onSelectPage} />
          </li>
        ))}
      </ol>
    </article>
  );
}
