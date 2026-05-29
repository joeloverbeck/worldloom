import { describe, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { CoveragePanel } from './CoveragePanel';

describe('CoveragePanel a11y', () => {
  it('has no accessibility violations when counts are available', async () => {
    const { container } = renderForAxe(
      <CoveragePanel
        sceneCoverageCounts={{
          status: 'available',
          activeSceneCount: 4,
          supersededSceneCount: 1,
          totalSceneCount: 5,
        }}
        unscenedRunCounts={{ status: 'available', runCount: 2, pageCount: 7 }}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('has no accessibility violations when degraded', async () => {
    const { container } = renderForAxe(
      <CoveragePanel
        sceneCoverageCounts={{
          status: 'degraded',
          activeSceneCount: null,
          supersededSceneCount: null,
          totalSceneCount: null,
        }}
        unscenedRunCounts={{ status: 'degraded', runCount: null, pageCount: null }}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
