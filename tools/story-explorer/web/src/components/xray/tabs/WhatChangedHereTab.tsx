import { useEffect, useMemo, useState } from 'react';

import { getRecord, type PageDetail, type RecordCard, type RecordDetail } from '../../../api/client';
import { RecordCardCompact } from '../RecordCardCompact';

interface WhatChangedHereTabProps {
  onRecordLinkClick?: (recordId: string) => void;
  pageDetail: PageDetail;
  storySlug: string;
  worldSlug: string;
}

type EventLoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; eventId: string }
  | { kind: 'loaded'; eventDetail: RecordDetail; storyletCard: RecordCard | null }
  | { kind: 'error'; eventId: string };

interface TurnDriver {
  kind?: string;
  initiator?: string;
  pov_visibility?: string;
  driver_records?: unknown;
}

interface StoryEventRecord {
  id?: string;
  event_kind?: string;
  actor?: string;
  targets?: unknown;
  turn_driver?: TurnDriver;
  outcome_route?: string;
  resolution?: unknown;
  commitment?: {
    selected_slt_id?: string | null;
  };
  world_logic_rationale?: string;
  state_delta?: {
    create?: unknown;
    supersede?: unknown;
    close?: unknown;
  };
  record_introductions?: unknown;
  state_relations?: unknown;
  non_propagation_facts?: unknown;
  promotion_claims?: unknown;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asStoryEventRecord(value: unknown): StoryEventRecord {
  return record(value) as StoryEventRecord;
}

function resolvedEventId(pageDetail: PageDetail): string | null {
  const pageInput = record(pageDetail.page.input);
  const pageResolvedEventId = pageInput.resolved_event_id;
  if (typeof pageResolvedEventId === 'string' && pageResolvedEventId.trim().length > 0) {
    return pageResolvedEventId;
  }

  return pageDetail.eventDelta.eventId;
}

function valueOrEmpty(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : 'none';
}

function resolutionSummary(value: unknown): string | null {
  const resolution = record(value);
  const result = resolution.result;
  const feedback = resolution.player_visible_feedback;
  const parts = [typeof result === 'string' ? result : null, typeof feedback === 'string' ? feedback : null].filter(
    (part): part is string => part !== null && part.length > 0,
  );

  return parts.length > 0 ? parts.join(' - ') : null;
}

function recordClass(recordId: string): string {
  return recordId.split('-')[0] ?? recordId;
}

function formatRecordChip(recordId: string): string {
  return `${recordId} - ${recordClass(recordId)}`;
}

function FieldRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RecordChipList({
  emptyLabel,
  ids,
  onRecordLinkClick,
}: {
  emptyLabel: string;
  ids: string[];
  onRecordLinkClick?: (recordId: string) => void;
}): JSX.Element {
  if (ids.length === 0) {
    return <p className="xray-empty-note">{emptyLabel}</p>;
  }

  return (
    <div className="record-card__chips">
      {ids.map((recordId) => (
        <button className="record-chip record-chip--button" key={recordId} onClick={() => onRecordLinkClick?.(recordId)} type="button">
          {formatRecordChip(recordId)}
        </button>
      ))}
    </div>
  );
}

function ObjectList({
  emptyLabel,
  items,
  renderItem,
}: {
  emptyLabel: string;
  items: unknown;
  renderItem: (item: Record<string, unknown>, index: number) => string;
}): JSX.Element {
  const records = Array.isArray(items) ? items.map(record) : [];

  if (records.length === 0) {
    return <p className="xray-empty-note">{emptyLabel}</p>;
  }

  return (
    <ul className="xray-structured-list">
      {records.map((item, index) => (
        <li key={`${renderItem(item, index)}:${index}`}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

export function WhatChangedHereTab({ onRecordLinkClick, pageDetail, storySlug, worldSlug }: WhatChangedHereTabProps): JSX.Element {
  const eventId = useMemo(() => resolvedEventId(pageDetail), [pageDetail]);
  const [eventState, setEventState] = useState<EventLoadState>(() =>
    eventId ? { kind: 'loading', eventId } : { kind: 'idle' },
  );

  useEffect(() => {
    let cancelled = false;

    if (!eventId) {
      setEventState({ kind: 'idle' });
      return () => {
        cancelled = true;
      };
    }

    setEventState({ kind: 'loading', eventId });
    void getRecord(worldSlug, storySlug, eventId)
      .then(async ({ payload }) => {
        const eventRecord = asStoryEventRecord(payload.record);
        const storyletId = eventRecord.commitment?.selected_slt_id ?? null;
        let storyletCard: RecordCard | null = null;

        if (storyletId) {
          try {
            const { payload: storyletPayload } = await getRecord(worldSlug, storySlug, storyletId);
            storyletCard = storyletPayload.recordCard;
          } catch {
            storyletCard = null;
          }
        }

        if (!cancelled) {
          setEventState({ kind: 'loaded', eventDetail: payload, storyletCard });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEventState({ kind: 'error', eventId });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, storySlug, worldSlug]);

  if (!eventId) {
    return (
      <section className="xray-tab-panel__body xray-tab-panel__body--event-delta" aria-labelledby="xray-what-changed-title">
        <h3 id="xray-what-changed-title">What Changed Here</h3>
        <p>No causal event for this page. This is usually the root page or a page with no resolved driver records.</p>
      </section>
    );
  }

  if (eventState.kind === 'loading') {
    return (
      <section className="xray-tab-panel__body xray-tab-panel__body--event-delta" aria-labelledby="xray-what-changed-title">
        <h3 id="xray-what-changed-title">What Changed Here</h3>
        <p role="status">Loading causal event {eventState.eventId}.</p>
      </section>
    );
  }

  if (eventState.kind === 'error') {
    return (
      <section className="xray-tab-panel__body xray-tab-panel__body--event-delta" aria-labelledby="xray-what-changed-title">
        <h3 id="xray-what-changed-title">What Changed Here</h3>
        <p role="alert">Unable to load causal event {eventState.eventId}.</p>
      </section>
    );
  }

  if (eventState.kind !== 'loaded') {
    return (
      <section className="xray-tab-panel__body xray-tab-panel__body--event-delta" aria-labelledby="xray-what-changed-title">
        <h3 id="xray-what-changed-title">What Changed Here</h3>
      </section>
    );
  }

  const eventRecord = asStoryEventRecord(eventState.eventDetail.record);
  const turnDriver = eventRecord.turn_driver ?? {};
  const targets = stringArray(eventRecord.targets);
  const created = stringArray(eventRecord.state_delta?.create);
  const superseded = stringArray(eventRecord.state_delta?.supersede);
  const closed = stringArray(eventRecord.state_delta?.close);
  const selectedStoryletId = eventRecord.commitment?.selected_slt_id ?? null;
  const outcomeResolution = resolutionSummary(eventRecord.resolution);

  return (
    <section className="xray-tab-panel__body xray-tab-panel__body--event-delta" aria-labelledby="xray-what-changed-title">
      <h3 id="xray-what-changed-title">What Changed Here</h3>
      <p className="xray-tab-panel__intro">Causal event and state changes for the current page.</p>
      <RecordCardCompact recordCard={eventState.eventDetail.recordCard} />
      <dl className="record-card__fields xray-event-fields">
        <FieldRow label="Selected event" value={`${valueOrEmpty(eventRecord.id)} - ${valueOrEmpty(eventRecord.event_kind)}`} />
        <FieldRow label="Actor -> Targets" value={`${valueOrEmpty(eventRecord.actor)} -> ${targets.join(', ') || 'none'}`} />
        <FieldRow
          label="Turn driver"
          value={`${valueOrEmpty(turnDriver.kind)} - initiator ${valueOrEmpty(turnDriver.initiator)} - POV ${valueOrEmpty(
            turnDriver.pov_visibility,
          )}`}
        />
        <FieldRow
          label="Outcome route"
          value={`${valueOrEmpty(eventRecord.outcome_route)}${outcomeResolution ? ` - resolution: ${outcomeResolution}` : ''}`}
        />
        <FieldRow label="World-logic rationale" value={valueOrEmpty(eventRecord.world_logic_rationale)} />
      </dl>
      {selectedStoryletId ? (
        <section className="xray-event-section" aria-labelledby="xray-selected-storylet-title">
          <h4 id="xray-selected-storylet-title">Selected Storylet</h4>
          {eventState.storyletCard ? (
            <RecordCardCompact recordCard={eventState.storyletCard} />
          ) : (
            <span className="record-chip record-chip--broken">{selectedStoryletId} unavailable</span>
          )}
        </section>
      ) : null}
      <section className="xray-event-section" aria-labelledby="xray-state-delta-title">
        <h4 id="xray-state-delta-title">State Delta</h4>
        <div className="xray-state-delta-grid">
          <div>
            <h5>Created</h5>
            <RecordChipList emptyLabel="No records created." ids={created} onRecordLinkClick={onRecordLinkClick} />
          </div>
          <div>
            <h5>Superseded</h5>
            <RecordChipList emptyLabel="No records superseded." ids={superseded} onRecordLinkClick={onRecordLinkClick} />
          </div>
          <div>
            <h5>Closed</h5>
            <RecordChipList emptyLabel="No records closed." ids={closed} onRecordLinkClick={onRecordLinkClick} />
          </div>
        </div>
      </section>
      <section className="xray-event-section" aria-labelledby="xray-introductions-title">
        <h4 id="xray-introductions-title">Record Introductions</h4>
        <ObjectList
          emptyLabel="No record introductions."
          items={eventRecord.record_introductions}
          renderItem={(item) => {
            const evidence = stringArray(item.evidence);
            return `${valueOrEmpty(item.record_id)} - ${valueOrEmpty(item.class)} via ${valueOrEmpty(item.trigger)}${
              evidence.length > 0 ? `; evidence ${evidence.join(', ')}` : ''
            }`;
          }}
        />
      </section>
      <section className="xray-event-section" aria-labelledby="xray-relations-title">
        <h4 id="xray-relations-title">State Relations</h4>
        <ObjectList
          emptyLabel="No state relations."
          items={eventRecord.state_relations}
          renderItem={(item) => `${valueOrEmpty(item.relation)} ${valueOrEmpty(item.target_record)}`}
        />
      </section>
      <section className="xray-event-section" aria-labelledby="xray-non-propagation-title">
        <h4 id="xray-non-propagation-title">Non-Propagation Facts</h4>
        <ObjectList
          emptyLabel="No non-propagation facts."
          items={eventRecord.non_propagation_facts}
          renderItem={(item) => {
            const records = stringArray(item.records);
            return `${valueOrEmpty(item.reason)} - ${valueOrEmpty(item.group)}${records.length > 0 ? ` (${records.join(', ')})` : ''}`;
          }}
        />
      </section>
      <section className="xray-event-section" aria-labelledby="xray-promotion-title">
        <h4 id="xray-promotion-title">Promotion Claims</h4>
        <ObjectList
          emptyLabel="No promotion claims."
          items={eventRecord.promotion_claims}
          renderItem={(item) => `${valueOrEmpty(item.source_record)} - ${valueOrEmpty(item.authority)}`}
        />
      </section>
    </section>
  );
}
