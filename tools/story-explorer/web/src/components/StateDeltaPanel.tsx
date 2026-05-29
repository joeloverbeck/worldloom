import type { EventDeltaSummary } from '../api/client';

interface StateDeltaPanelProps {
  // One entry per included page's resolving event (SceneDetail.eventDeltas).
  eventDeltas: EventDeltaSummary[];
}

function DeltaRow({ delta }: { delta: EventDeltaSummary }): JSX.Element {
  const label = delta.eventId ?? 'no resolving event';

  return (
    <li className="state-delta-panel__row" data-testid="state-delta-row" data-event-id={delta.eventId ?? ''}>
      <h3 className="state-delta-panel__event">{label}</h3>
      <dl className="state-delta-panel__counts">
        <div>
          <dt>Created</dt>
          <dd data-testid="state-delta-create">{delta.createCount}</dd>
        </div>
        <div>
          <dt>Superseded</dt>
          <dd data-testid="state-delta-supersede">{delta.supersedeCount}</dd>
        </div>
        <div>
          <dt>Closed</dt>
          <dd data-testid="state-delta-close">{delta.closeCount}</dd>
        </div>
        <div>
          <dt>Relations</dt>
          <dd data-testid="state-delta-relations">{delta.relationCount}</dd>
        </div>
      </dl>
      {delta.introducedRecordIds.length > 0 ? (
        <ul className="state-delta-panel__introduced" aria-label={`Records introduced at ${label}`}>
          {delta.introducedRecordIds.map((recordId) => (
            <li key={recordId}>{recordId}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function StateDeltaPanel({ eventDeltas }: StateDeltaPanelProps): JSX.Element {
  return (
    <section className="state-delta-panel" aria-labelledby="state-delta-title">
      <h2 id="state-delta-title">Event deltas</h2>
      {eventDeltas.length === 0 ? (
        <p className="state-delta-panel__empty">No event deltas in this scene's page range.</p>
      ) : (
        <ol className="state-delta-panel__list" aria-label="Event deltas">
          {eventDeltas.map((delta, index) => (
            <DeltaRow key={`${delta.eventId ?? 'none'}-${index}`} delta={delta} />
          ))}
        </ol>
      )}
    </section>
  );
}
