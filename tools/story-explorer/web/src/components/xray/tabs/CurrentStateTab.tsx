import type { PageDetail } from '../../../api/client';

interface CurrentStateTabProps {
  pageDetail: PageDetail;
}

export function CurrentStateTab({ pageDetail }: CurrentStateTabProps): JSX.Element {
  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-current-state-title">
      <h3 id="xray-current-state-title">Current State</h3>
      <p>{pageDetail.currentStateRecordIds.length} active records. Tab content to be filled by SPEC89STOEXPSTA-004.</p>
    </section>
  );
}
