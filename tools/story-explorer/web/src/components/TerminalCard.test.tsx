import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TerminalReason } from '../api/client';
import { TerminalCard } from './TerminalCard';

const cases: Array<[TerminalReason, string]> = [
  ['no_children', 'All emitted choices currently have no continued child page.'],
  ['paused', 'Branch has reached a paused state per PG metadata.'],
  ['terminal', 'Terminal page per PG metadata.'],
  [null, 'No further pages from this point.'],
];

describe('TerminalCard', () => {
  it.each(cases)('renders terminal reason copy for %s', (terminalReason, expectedCopy) => {
    render(<TerminalCard terminalReason={terminalReason} />);

    expect(screen.getByRole('heading', { name: 'No committed continuation from this page.' })).toBeInTheDocument();
    expect(screen.getByText(expectedCopy)).toBeInTheDocument();
  });

  it('has no action controls', () => {
    render(<TerminalCard terminalReason="terminal" />);

    const card = screen.getByText('Terminal page per PG metadata.').closest('.terminal-card');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).queryByRole('button')).not.toBeInTheDocument();
    expect(within(card as HTMLElement).queryByRole('link')).not.toBeInTheDocument();
    expect(within(card as HTMLElement).queryByText(/continue|next|generate/i)).not.toBeInTheDocument();
  });
});
