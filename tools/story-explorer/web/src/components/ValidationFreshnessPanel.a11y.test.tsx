import { describe, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ValidationFreshnessPanel } from './ValidationFreshnessPanel';

describe('ValidationFreshnessPanel a11y', () => {
  it('renders without axe violations', async () => {
    const { container } = renderForAxe(
      <ValidationFreshnessPanel
        publicationState="attached:WARN"
        artifactAvailability={{ hasPlan: true, hasProse: true, hasReceipt: true }}
      />,
    );

    await expectNoAxeViolations(container);
  });
});
