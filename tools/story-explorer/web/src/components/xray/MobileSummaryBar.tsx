import type { ChangeEvent } from 'react';

import type { PageDetail } from '../../api/client';
import { countRecordIdsByGroup, CURRENT_STATE_GROUPS, groupAnchorId } from './groupActiveRecords';

interface MobileSummaryBarProps {
  pageDetail: PageDetail;
}

function totalActiveRecordCount(pageDetail: PageDetail): number {
  return pageDetail.currentStateRecordIds.length;
}

export function MobileSummaryBar({ pageDetail }: MobileSummaryBarProps): JSX.Element {
  const counts = countRecordIdsByGroup(pageDetail.currentStateRecordIds);
  const delta = pageDetail.eventDelta;

  function handleGroupJump(event: ChangeEvent<HTMLSelectElement>): void {
    const target = document.getElementById(event.target.value);
    target?.scrollIntoView({ block: 'start' });
    target?.focus();
  }

  return (
    <div className="xray-mobile-summary" aria-label="State X-Ray summary">
      <div className="xray-mobile-summary__stats">
        <span className="xray-summary-chip xray-summary-chip--primary">{totalActiveRecordCount(pageDetail)} active</span>
        <span className="xray-summary-chip">Created {delta.createCount}</span>
        <span className="xray-summary-chip">Superseded {delta.supersedeCount}</span>
        <span className="xray-summary-chip">Closed {delta.closeCount}</span>
      </div>
      <label className="xray-mobile-summary__jump">
        <span>Jump to group</span>
        <select onChange={handleGroupJump} defaultValue="">
          <option value="" disabled>
            Select group
          </option>
          {CURRENT_STATE_GROUPS.map((group) => (
            <option key={group} value={groupAnchorId(group)}>
              {group} ({counts[group]})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
