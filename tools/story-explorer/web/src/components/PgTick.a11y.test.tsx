import { describe, it, vi } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { PgTick } from './PgTick';

describe('PgTick a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderForAxe(<PgTick pageId="PG-7" onSelect={vi.fn()} />);
    await expectNoAxeViolations(container);
  });

  it('has no accessibility violations when focused', async () => {
    const { container } = renderForAxe(<PgTick pageId="PG-7" onSelect={vi.fn()} focused />);
    await expectNoAxeViolations(container);
  });
});
