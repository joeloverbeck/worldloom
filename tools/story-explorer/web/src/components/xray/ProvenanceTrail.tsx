import { useEffect, useState } from 'react';

import { getProvenance, getRecord, type RecordProvenance } from '../../api/client';

interface StoryContext {
  worldSlug: string;
  storySlug: string;
}

interface ProvenanceTrailProps {
  onRecordLinkClick?: (recordId: string) => void;
  recordId: string;
  storyContext: StoryContext;
}

type EventAttribution =
  | { kind: 'loaded'; eventId: string; pageId: string | null }
  | { kind: 'error'; eventId: string };

type ProvenanceState =
  | { kind: 'loading' }
  | { kind: 'loaded'; provenance: RecordProvenance; creatingEvent: EventAttribution | null; modifyingEvents: EventAttribution[] }
  | { kind: 'error' };

function createdAtPage(record: Record<string, unknown>): string | null {
  return typeof record.created_at_page === 'string' && record.created_at_page.length > 0 ? record.created_at_page : null;
}

function EventAttributionChip({
  attribution,
  onRecordLinkClick,
}: {
  attribution: EventAttribution;
  onRecordLinkClick?: (recordId: string) => void;
}): JSX.Element {
  const pageLabel = attribution.kind === 'error' ? '<unknown>' : attribution.pageId ?? '<unknown>';
  const className = attribution.kind === 'error' ? 'record-chip record-chip--button record-chip--warning' : 'record-chip record-chip--button';

  return (
    <button className={className} onClick={() => onRecordLinkClick?.(attribution.eventId)} type="button">
      {attribution.eventId} at {pageLabel}
    </button>
  );
}

async function resolveEventAttribution(storyContext: StoryContext, eventId: string): Promise<EventAttribution> {
  try {
    const { payload } = await getRecord(storyContext.worldSlug, storyContext.storySlug, eventId);
    return { kind: 'loaded', eventId, pageId: createdAtPage(payload.record) };
  } catch {
    return { kind: 'error', eventId };
  }
}

export function ProvenanceTrail({ onRecordLinkClick, recordId, storyContext }: ProvenanceTrailProps): JSX.Element {
  const [state, setState] = useState<ProvenanceState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    void getProvenance(storyContext.worldSlug, storyContext.storySlug, recordId)
      .then(async ({ payload }) => {
        const [creatingEvent, modifyingEvents] = await Promise.all([
          payload.creatingSeId ? resolveEventAttribution(storyContext, payload.creatingSeId) : Promise.resolve(null),
          Promise.all(payload.modifyingSeIds.map((eventId) => resolveEventAttribution(storyContext, eventId))),
        ]);

        if (!cancelled) {
          setState({ kind: 'loaded', provenance: payload, creatingEvent, modifyingEvents });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [recordId, storyContext]);

  if (state.kind === 'loading') {
    return <p role="status">Loading provenance for {recordId}.</p>;
  }

  if (state.kind === 'error') {
    return <p role="alert">Unable to load provenance for {recordId}.</p>;
  }

  return (
    <div className="provenance-trail">
      <dl className="record-card__fields">
        <div>
          <dt>Created by</dt>
          <dd>
            {state.creatingEvent ? (
              <EventAttributionChip attribution={state.creatingEvent} onRecordLinkClick={onRecordLinkClick} />
            ) : (
              'Bootstrap provenance'
            )}
          </dd>
        </div>
        <div>
          <dt>Modified by</dt>
          <dd className="provenance-trail__chips">
            {state.modifyingEvents.length > 0
              ? state.modifyingEvents.map((attribution) => (
                  <EventAttributionChip
                    attribution={attribution}
                    key={attribution.eventId}
                    onRecordLinkClick={onRecordLinkClick}
                  />
                ))
              : 'No modifying events'}
          </dd>
        </div>
      </dl>
      <div className="provenance-trail__evidence" aria-label="Evidence records">
        {state.provenance.evidenceRecords.length > 0 ? (
          state.provenance.evidenceRecords.map((evidenceRecordId) => (
            <button className="record-chip record-chip--button" key={evidenceRecordId} onClick={() => onRecordLinkClick?.(evidenceRecordId)} type="button">
              {evidenceRecordId}
            </button>
          ))
        ) : (
          <span className="xray-empty-note">No evidence records.</span>
        )}
      </div>
    </div>
  );
}
