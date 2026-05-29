import type { ReactNode } from 'react';

import type { IndexStatus, ResponseEnvelope } from '../api/client';
import { IndexStatusBanner } from '../components/IndexStatusBanner';

function indexStatusBannerFor(status: IndexStatus | null | undefined): ReactNode {
  if (!status || status.kind === 'fresh') {
    return null;
  }

  return <IndexStatusBanner status={status} />;
}

export function useIndexStatusBanner(envelope: ResponseEnvelope | null): ReactNode {
  return indexStatusBannerFor(envelope?.worldIndexStatus);
}

// Variant for payloads that carry their own derived index status (e.g. the
// story overview's `indexStatus`), which can be degraded even when the
// transport envelope is fresh (degraded direct read). Avoids synthesizing a
// fake envelope just to reuse the banner.
export function useIndexStatusBannerFromStatus(status: IndexStatus | null | undefined): ReactNode {
  return indexStatusBannerFor(status);
}
