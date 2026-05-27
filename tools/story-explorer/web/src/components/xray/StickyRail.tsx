import type { PageDetail } from '../../api/client';
import { countRecordIdsByGroup, CURRENT_STATE_GROUPS, groupAnchorId } from './groupActiveRecords';

interface StickyRailProps {
  pageDetail: PageDetail;
}

function pageId(pageDetail: PageDetail): string {
  const id = pageDetail.page.id;
  return typeof id === 'string' && id.length > 0 ? id : 'Unknown page';
}

function receiptStatus(pageDetail: PageDetail): string {
  if (pageDetail.validationIntegrity.receiptPresence) {
    return pageDetail.validationIntegrity.receiptPresence;
  }

  return pageDetail.receiptSummary === null ? 'missing' : 'present';
}

export function StickyRail({ pageDetail }: StickyRailProps): JSX.Element {
  const counts = countRecordIdsByGroup(pageDetail.currentStateRecordIds);
  const delta = pageDetail.eventDelta;

  return (
    <div className="xray-sticky-rail">
      <div className="xray-summary-chip xray-summary-chip--primary">
        {pageId(pageDetail)} · {pageDetail.branchContext.branchId}
      </div>
      <div className="xray-summary-status" aria-label="Prose and receipt status">
        <span className={`xray-summary-chip xray-summary-chip--${pageDetail.proseStatus}`}>Prose {pageDetail.proseStatus}</span>
        <span className="xray-summary-chip">Receipt {receiptStatus(pageDetail)}</span>
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
