import { describe, it } from 'vitest';

import type { IndexStatus } from '../api/client';
import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { IndexStatusBanner } from './IndexStatusBanner';

describe('IndexStatusBanner a11y', () => {
  it('uses status semantics for degraded index states', async () => {
    const status: IndexStatus = { kind: 'stale', driftedFiles: ['PG-12.yaml'], remedy: 'Run world-index sync.' };
    const { container, getByRole } = renderForAxe(<IndexStatusBanner status={status} />);

    getByRole('status');
    await expectNoAxeViolations(container);
  });
});
