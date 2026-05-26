import type { PageDetail } from '../../../api/client';

interface WhatChangedHereTabProps {
  pageDetail: PageDetail;
}

export function WhatChangedHereTab({ pageDetail }: WhatChangedHereTabProps): JSX.Element {
  const eventLabel = pageDetail.eventDelta.eventId ?? 'No resolved event';

  return (
    <section className="xray-tab-panel__body" aria-labelledby="xray-what-changed-title">
      <h3 id="xray-what-changed-title">What Changed Here</h3>
      <p>
        {eventLabel}. Tab content to be filled by SPEC89STOEXPSTA-005.
      </p>
    </section>
  );
}
