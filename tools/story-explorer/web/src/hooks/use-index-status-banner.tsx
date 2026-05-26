import type { ReactNode } from 'react';

import type { ResponseEnvelope } from '../api/client';
import { IndexStatusBanner } from '../components/IndexStatusBanner';

export function useIndexStatusBanner(envelope: ResponseEnvelope | null): ReactNode {
  if (!envelope?.worldIndexStatus || envelope.worldIndexStatus.kind === 'fresh') {
    return null;
  }

  return <IndexStatusBanner status={envelope.worldIndexStatus} />;
}
