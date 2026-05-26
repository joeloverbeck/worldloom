import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { BackendUnreachablePage } from './BackendUnreachablePage';

describe('BackendUnreachablePage a11y', () => {
  it('has no axe violations and exposes the retry action', async () => {
    const { container, getByRole } = renderForAxe(<BackendUnreachablePage onRetry={vi.fn()} />);

    expect(getByRole('alert')).toHaveAccessibleName('Backend is unreachable.');
    expect(getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
