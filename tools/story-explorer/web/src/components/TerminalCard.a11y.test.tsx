import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { TerminalCard } from './TerminalCard';

describe('TerminalCard a11y', () => {
  it('uses a section-level heading for branch pause context', async () => {
    const { container, getByRole, getByText } = renderForAxe(<TerminalCard terminalReason="paused" />);

    expect(getByRole('heading', { level: 3, name: 'No committed continuation from this page.' })).toBeInTheDocument();
    expect(getByText('Branch has reached a paused state per PG metadata.')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
