import type { PageDetail } from '../../../api/client';

interface ValidationIntegrityTabProps {
  pageDetail: PageDetail;
}

export function ValidationIntegrityTab({ pageDetail }: ValidationIntegrityTabProps): JSX.Element {
  const receiptVerdict = pageDetail.validationIntegrity.receiptVerdict ?? 'No receipt verdict';

  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-validation-title">
      <h3 id="xray-validation-title">Validation & Integrity</h3>
      <p>{receiptVerdict}. Tab content to be filled by SPEC89STOEXPSTA-007.</p>
    </section>
  );
}
