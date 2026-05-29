import type { StateTickXray } from '../../api/client';
import { countRecordIdsByGroup, CURRENT_STATE_GROUPS, groupAnchorId } from './groupActiveRecords';

interface StickyRailProps {
  tick: StateTickXray;
}

function activeRecordIds(tick: StateTickXray): string[] {
  return Object.values(tick.activeRecordsByClass).flat();
}

export function StickyRail({ tick }: StickyRailProps): JSX.Element {
  const counts = countRecordIdsByGroup(activeRecordIds(tick));
  const delta = tick.eventDelta;

  return (
    <div className="xray-sticky-rail">
      <div className="xray-summary-chip xray-summary-chip--primary">
        {tick.pageId} · {tick.branchId}
      </div>
      <section className="xray-summary-section" aria-labelledby="xray-rail-counts-title">
        <h3 id="xray-rail-counts-title">Active Records</h3>
        <ul className="xray-summary-list">
          {CURRENT_STATE_GROUPS.map((group) => (
            <li key={group}>
              <span>{group}</span>
              <strong>{counts[group]}</strong>
            </li>
          ))}
        </ul>
      </section>
      <section className="xray-summary-section" aria-labelledby="xray-rail-delta-title">
        <h3 id="xray-rail-delta-title">What Changed</h3>
        <p className="xray-summary-delta">
          Created {delta.createCount} · Superseded {delta.supersedeCount} · Closed {delta.closeCount}
        </p>
      </section>
      <nav className="xray-summary-section" aria-labelledby="xray-rail-toc-title">
        <h3 id="xray-rail-toc-title">Jump to group</h3>
        <ul className="xray-summary-toc">
          {CURRENT_STATE_GROUPS.map((group) => (
            <li key={group}>
              <a href={`#${groupAnchorId(group)}`}>{group}</a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
