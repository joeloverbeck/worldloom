import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { getRecord, type RecordCard, type RecordGroup, type RecordLink, type StateTickXray } from '../../../api/client';
import { CURRENT_STATE_GROUPS, emptyGroups, groupForRecordId } from '../groupActiveRecords';
import { RecordCardCompact } from '../RecordCardCompact';
import { RecordCardExpanded } from '../RecordCardExpanded';
import { XRayGroup } from '../XRayGroup';

export { CURRENT_STATE_GROUPS } from '../groupActiveRecords';

interface CurrentStateTabProps {
  onRecordLinkClick?: (link: RecordLink | string) => void;
  tick: StateTickXray;
  storySlug: string;
  worldSlug: string;
}

export const VIRTUALIZATION_THRESHOLD = 50;

type RecordLoadState =
  | { kind: 'loading' }
  | { body: string | null; kind: 'loaded'; recordCard: RecordCard }
  | { kind: 'error'; recordId: string };

interface LoadedRecord {
  body: string | null;
  recordCard: RecordCard;
}

function groupRecords(records: LoadedRecord[]): Record<RecordGroup, LoadedRecord[]> {
  return records.reduce((groups, record) => {
    const recordCard = record.recordCard;
    groups[groupForRecordId(recordCard.recordId)].push(record);
    return groups;
  }, emptyGroups<LoadedRecord>());
}

function RecordList({
  records,
  onRecordLinkClick,
  storySlug,
  worldSlug,
}: {
  onRecordLinkClick?: (link: RecordLink | string) => void;
  records: LoadedRecord[];
  storySlug: string;
  worldSlug: string;
}): JSX.Element | null {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 168,
    overscan: 4,
  });

  if (records.length === 0) {
    return null;
  }

  if (records.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div className="xray-record-list">
        {records.map(({ body, recordCard }) => (
          <RecordCardExpanded
            key={recordCard.recordId}
            onRecordLinkClick={onRecordLinkClick}
            recordBody={body}
            recordCard={recordCard}
            storyContext={{ storySlug, worldSlug }}
          />
        ))}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const windowedItems =
    virtualItems.length > 0
      ? virtualItems
      : records.slice(0, 12).map((_, index) => ({ index, key: records[index]?.recordCard.recordId ?? index, start: index * 168, size: 168 }));

  return (
    <div
      aria-label={`Virtualized record list with ${records.length} records`}
      className="xray-record-list xray-record-list--virtualized"
      ref={parentRef}
    >
      <div className="xray-record-list__spacer" style={{ height: `${Math.max(virtualizer.getTotalSize(), records.length * 168)}px` }}>
        {windowedItems.map((virtualItem) => {
          const record = records[virtualItem.index];
          if (!record) {
            return null;
          }

          return (
            <div
              className="xray-record-list__virtual-row"
              data-index={virtualItem.index}
              key={virtualItem.key}
              style={{ transform: `translateY(${virtualItem.start}px)`, height: `${virtualItem.size}px` }}
            >
              <RecordCardCompact recordCard={record.recordCard} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CurrentStateTab({ onRecordLinkClick, tick, storySlug, worldSlug }: CurrentStateTabProps): JSX.Element {
  const activeRecordIds = useMemo(() => Object.values(tick.activeRecordsByClass).flat(), [tick.activeRecordsByClass]);
  const [records, setRecords] = useState<RecordLoadState[]>(() => activeRecordIds.map(() => ({ kind: 'loading' })));
  const affordances = tick.visibleAffordances;

  useEffect(() => {
    let cancelled = false;

    if (activeRecordIds.length === 0) {
      setRecords((previousRecords) => (previousRecords.length === 0 ? previousRecords : []));
      return () => {
        cancelled = true;
      };
    }

    setRecords(activeRecordIds.map(() => ({ kind: 'loading' })));
    void Promise.all(
      activeRecordIds.map(async (recordId): Promise<RecordLoadState> => {
        try {
          const { payload } = await getRecord(worldSlug, storySlug, recordId);
          const body = typeof payload.record.body === 'string' ? payload.record.body : null;
          return { body, kind: 'loaded', recordCard: payload.recordCard };
        } catch {
          return { kind: 'error', recordId };
        }
      }),
    ).then((loadedRecords) => {
      if (!cancelled) {
        setRecords(loadedRecords);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeRecordIds, storySlug, worldSlug]);

  const loadedRecords = records.flatMap((record) => (record.kind === 'loaded' ? [record] : []));
  const failedRecordIds = records.flatMap((record) => (record.kind === 'error' ? [record.recordId] : []));
  const loadingCount = records.filter((record) => record.kind === 'loading').length;
  const groupedRecords = groupRecords(loadedRecords);

  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-current-state-title">
      <h3 id="xray-current-state-title">Current State</h3>
      <p>{activeRecordIds.length} active records.</p>
      {loadingCount > 0 ? <p role="status">Loading {loadingCount} active records.</p> : null}
      {failedRecordIds.length > 0 ? (
        <p role="alert">Unable to load {failedRecordIds.join(', ')} for compact-card display.</p>
      ) : null}
      <div className="xray-current-state-groups">
        {CURRENT_STATE_GROUPS.map((group) => {
          const groupRecordsForDisplay = groupedRecords[group];
          const groupRecordCards = groupRecordsForDisplay.map((record) => record.recordCard);
          const showAffordances = group === 'Scene & Affordances' && affordances.length > 0;

          return (
            <XRayGroup group={group} key={group} records={groupRecordCards}>
              {showAffordances ? (
                <div className="xray-affordances" aria-label="Visible affordances">
                  {affordances.map((affordance) => (
                    <span className="record-chip" key={affordance}>
                      {affordance}
                    </span>
                  ))}
                </div>
              ) : null}
              <RecordList
                onRecordLinkClick={onRecordLinkClick}
                records={groupRecordsForDisplay}
                storySlug={storySlug}
                worldSlug={worldSlug}
              />
            </XRayGroup>
          );
        })}
      </div>
    </section>
  );
}
