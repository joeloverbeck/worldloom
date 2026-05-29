import { describe, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { StateDeltaPanel } from './StateDeltaPanel';

describe('StateDeltaPanel a11y', () => {
  it('renders deltas without axe violations', async () => {
    const { container } = renderForAxe(
      <StateDeltaPanel
        eventDeltas={[
          {
            eventId: 'SE-4',
            createCount: 2,
            supersedeCount: 1,
            closeCount: 0,
            introducedRecordIds: ['STENT-7'],
            relationCount: 3,
          },
        ]}
      />,
    );

    await expectNoAxeViolations(container);
  });
});
