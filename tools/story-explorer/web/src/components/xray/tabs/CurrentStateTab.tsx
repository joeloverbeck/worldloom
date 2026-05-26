import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { getRecord, type PageDetail, type RecordCard, type RecordGroup, type RecordLink } from '../../../api/client';
import { RecordCardCompact } from '../RecordCardCompact';
import { RecordCardExpanded } from '../RecordCardExpanded';
import { XRayGroup } from '../XRayGroup';

interface CurrentStateTabProps {
  onRecordLinkClick?: (link: RecordLink | string) => void;
  pageDetail: PageDetail;
  storySlug: string;
  worldSlug: string;
}

export const CURRENT_STATE_GROUPS: RecordGroup[] = [
  'Cast & Status',
  'Scene & Affordances',
  'Knowledge & Truth',
  'Plans & Emotion',
  'Relationships & Debts',
  'Pressure & Open Loops',
  'Event Delta',
  'Validation & Integrity',
];

export const VIRTUALIZATION_THRESHOLD = 50;

const GROUP_BY_CLASS_PREFIX: Record<string, RecordGroup> = {
  STENT: 'Cast & Status',
  STCHAR: 'Cast & Status',
  STSTAT: 'Cast & Status',
  BR: 'Cast & Status',
  STLOC: 'Scene & Affordances',
  STOBJ: 'Scene & Affordances',
  DA: 'Scene & Affordances',
  BEL: 'Knowledge & Truth',
  SF: 'Knowledge & Truth',
  STSEC: 'Knowledge & Truth',
  STQ: 'Knowledge & Truth',
  STPLAN: 'Plans & Emotion',
  STEMO: 'Plans & Emotion',
  STINT: 'Plans & Emotion',
  SREL: 'Relationships & Debts',
  OBL: 'Relationships & Debts',
  CNSQ: 'Pressure & Open Loops',
  THR: 'Pressure & Open Loops',
  CLK: 'Pressure & Open Loops',
  SLT: 'Pressure & Open Loops',
  SE: 'Event Delta',
  CHC: 'Event Delta',
};

type RecordLoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; recordCard: RecordCard }
  | { kind: 'error'; recordId: string };

function recordClassPrefix(recordId: string): string {
  return recordId.split('-')[0] ?? recordId;
}

function groupForRecordId(recordId: string): RecordGroup {
  return GROUP_BY_CLASS_PREFIX[recordClassPrefix(recordId)] ?? 'Validation & Integrity';
}

function emptyGroups(): Record<RecordGroup, RecordCard[]> {
  const groups = {} as Record<RecordGroup, RecordCard[]>;
  for (const group of CURRENT_STATE_GROUPS) {
    groups[group] = [];
  }

  return groups;
}

function groupRecords(recordCards: RecordCard[]): Record<RecordGroup, RecordCard[]> {
  return recordCards.reduce((groups, recordCard) => {
    groups[groupForRecordId(recordCard.recordId)].push(recordCard);
    return groups;
  }, emptyGroups());
}

function visibleAffordances(page: Record<string, unknown>): string[] {
  const stateSnapshot = page.state_snapshot;
  if (typeof stateSnapshot !== 'object' || stateSnapshot === null) {
    return [];
  }

  const affordances = (stateSnapshot as { visible_affordances?: unknown }).visible_affordances;
  return Array.isArray(affordances) ? affordances.filter((value): value is string => typeof value === 'string') : [];
}

function RecordList({
  records,
  onRecordLinkClick,
  storySlug,
  worldSlug,
}: {
  onRecordLinkClick?: (link: RecordLink | string) => void;
  records: RecordCard[];
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
        {records.map((recordCard) => (
          <RecordCardExpanded
            key={recordCard.recordId}
            onRecordLinkClick={onRecordLinkClick}
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
      : records.slice(0, 12).map((_, index) => ({ index, key: records[index]?.recordId ?? index, start: index * 168, size: 168 }));

  return (
    <div
      aria-label={`Virtualized record list with ${records.length} records`}
      className="xray-record-list xray-record-list--virtualized"
      ref={parentRef}
    >
      <div className="xray-record-list__spacer" style={{ height: `${Math.max(virtualizer.getTotalSize(), records.length * 168)}px` }}>
        {windowedItems.map((virtualItem) => {
          const recordCard = records[virtualItem.index];
          if (!recordCard) {
            return null;
          }

          return (
            <div
              className="xray-record-list__virtual-row"
              data-index={virtualItem.index}
              key={virtualItem.key}
              style={{ transform: `translateY(${virtualItem.start}px)`, height: `${virtualItem.size}px` }}
            >
              <RecordCardCompact recordCard={recordCard} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CurrentStateTab({ onRecordLinkClick, pageDetail, storySlug, worldSlug }: CurrentStateTabProps): JSX.Element {
  const [records, setRecords] = useState<RecordLoadState[]>(() =>
    pageDetail.currentStateRecordIds.map(() => ({ kind: 'loading' })),
  );
  const affordances = useMemo(() => visibleAffordances(pageDetail.page), [pageDetail.page]);

  useEffect(() => {
    let cancelled = false;

    if (pageDetail.currentStateRecordIds.length === 0) {
      setRecords((previousRecords) => (previousRecords.length === 0 ? previousRecords : []));
      return () => {
        cancelled = true;
      };
    }

    setRecords(pageDetail.currentStateRecordIds.map(() => ({ kind: 'loading' })));
    void Promise.all(
      pageDetail.currentStateRecordIds.map(async (recordId): Promise<RecordLoadState> => {
        try {
          const { payload } = await getRecord(worldSlug, storySlug, recordId);
          return { kind: 'loaded', recordCard: payload.recordCard };
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
  }, [pageDetail.currentStateRecordIds, storySlug, worldSlug]);

  const loadedRecordCards = records.flatMap((record) => (record.kind === 'loaded' ? [record.recordCard] : []));
  const failedRecordIds = records.flatMap((record) => (record.kind === 'error' ? [record.recordId] : []));
  const loadingCount = records.filter((record) => record.kind === 'loading').length;
  const groupedRecords = groupRecords(loadedRecordCards);

  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-current-state-title">
      <h3 id="xray-current-state-title">Current State</h3>
      <p>{pageDetail.currentStateRecordIds.length} active records.</p>
      {loadingCount > 0 ? <p role="status">Loading {loadingCount} active records.</p> : null}
      {failedRecordIds.length > 0 ? (
        <p role="alert">Unable to load {failedRecordIds.join(', ')} for compact-card display.</p>
      ) : null}
      <div className="xray-current-state-groups">
        {CURRENT_STATE_GROUPS.map((group) => {
          const groupRecordsForDisplay = groupedRecords[group];
          const showAffordances = group === 'Scene & Affordances' && affordances.length > 0;

          return (
            <XRayGroup group={group} key={group} records={groupRecordsForDisplay}>
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
