import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { RouteLoading } from './RouteLoading';

describe('RouteLoading a11y', () => {
  it('uses a named status region', async () => {
    const { container, getByRole } = renderForAxe(<RouteLoading label="Loading page..." />);

    expect(getByRole('status', { name: 'Loading page...' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
