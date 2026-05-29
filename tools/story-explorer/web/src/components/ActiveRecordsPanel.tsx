import type { RecordGroup } from '../api/client';
import { CURRENT_STATE_GROUPS, GROUP_BY_CLASS_PREFIX } from './xray/groupActiveRecords';

interface ActiveRecordsPanelProps {
  // Active-record counts keyed by record class (e.g. STENT → 3), as carried by a
  // ScenePageSummary.activeRecordCounts; the panel groups classes by the shared
  // x-ray taxonomy so scene detail and the x-ray drawer read alike.
  activeRecordCounts: Record<string, number>;
  // The PG whose active state these counts describe (for the panel caption).
  pageId: string | null;
}

interface ClassCount {
  recordClass: string;
  count: number;
}

function groupCounts(activeRecordCounts: Record<string, number>): Map<RecordGroup, ClassCount[]> {
  const grouped = new Map<RecordGroup, ClassCount[]>();
  for (const [recordClass, count] of Object.entries(activeRecordCounts)) {
    if (count <= 0) {
      continue;
    }
    const group = GROUP_BY_CLASS_PREFIX[recordClass] ?? 'Validation & Integrity';
    const bucket = grouped.get(group) ?? [];
    bucket.push({ recordClass, count });
    grouped.set(group, bucket);
  }
  return grouped;
}

export function ActiveRecordsPanel({ activeRecordCounts, pageId }: ActiveRecordsPanelProps): JSX.Element {
  const grouped = groupCounts(activeRecordCounts);
  const total = Object.values(activeRecordCounts).reduce((sum, count) => sum + Math.max(0, count), 0);

  return (
    <section className="active-records-panel" aria-labelledby="active-records-title">
      <h2 id="active-records-title">Active records</h2>
      <p className="active-records-panel__caption">
        {pageId === null ? 'Active state' : `Active at ${pageId}`} · {total} {total === 1 ? 'record' : 'records'}
      </p>
      {total === 0 ? (
        <p className="active-records-panel__empty">No active records at this page.</p>
      ) : (
        <dl className="active-records-panel__groups">
          {CURRENT_STATE_GROUPS.filter((group) => (grouped.get(group)?.length ?? 0) > 0).map((group) => (
            <div className="active-records-panel__group" key={group} data-testid="active-records-group">
              <dt>{group}</dt>
              <dd>
                <ul>
                  {grouped.get(group)?.map(({ recordClass, count }) => (
                    <li key={recordClass} data-record-class={recordClass}>
                      {recordClass} · {count}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
