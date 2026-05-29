import type { ChangeEvent } from 'react';

import type { StateTickXray } from '../../api/client';
import { countRecordIdsByGroup, CURRENT_STATE_GROUPS, groupAnchorId } from './groupActiveRecords';

interface MobileSummaryBarProps {
  tick: StateTickXray;
}

function activeRecordIds(tick: StateTickXray): string[] {
  return Object.values(tick.activeRecordsByClass).flat();
}

export function MobileSummaryBar({ tick }: MobileSummaryBarProps): JSX.Element {
  const recordIds = activeRecordIds(tick);
  const counts = countRecordIdsByGroup(recordIds);
  const delta = tick.eventDelta;

  function handleGroupJump(event: ChangeEvent<HTMLSelectElement>): void {
    const target = document.getElementById(event.target.value);
    target?.scrollIntoView({ block: 'start' });
    target?.focus();
  }

  return (
    <div className="xray-mobile-summary" aria-label="State X-Ray summary">
      <div className="xray-mobile-summary__stats">
        <span className="xray-summary-chip xray-summary-chip--primary">{recordIds.length} active</span>
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
