import type { PageDetail } from '../../../api/client';

interface PlanProseTabProps {
  pageDetail: PageDetail;
}

export function PlanProseTab({ pageDetail }: PlanProseTabProps): JSX.Element {
  const planStatus = pageDetail.pagePlanSummary ? 'Page plan summary present' : 'No page plan summary';

  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-plan-prose-title">
      <h3 id="xray-plan-prose-title">Plan & Prose</h3>
      <p>{planStatus}. Tab content to be filled by SPEC89STOEXPSTA-006.</p>
    </section>
  );
}
