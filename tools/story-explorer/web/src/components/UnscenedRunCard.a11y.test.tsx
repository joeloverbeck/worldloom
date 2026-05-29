import { describe, it, vi } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { UnscenedRunCard } from './UnscenedRunCard';

describe('UnscenedRunCard a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderForAxe(
      <UnscenedRunCard pageIds={['PG-7', 'PG-8']} startPageId="PG-7" endPageId="PG-8" onSelectPage={vi.fn()} />,
    );
    await expectNoAxeViolations(container);
  });
});
