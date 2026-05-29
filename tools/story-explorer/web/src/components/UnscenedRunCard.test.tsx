import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UnscenedRunCard } from './UnscenedRunCard';

describe('UnscenedRunCard', () => {
  it('renders the range, page count, and a tick per page', () => {
    render(
      <UnscenedRunCard pageIds={['PG-7', 'PG-8', 'PG-9']} startPageId="PG-7" endPageId="PG-9" onSelectPage={vi.fn()} />,
    );

    expect(screen.getByText('PG-7 → PG-9')).toBeInTheDocument();
    expect(screen.getByTestId('unscened-run-count')).toHaveTextContent('3 pages');
    expect(screen.getByRole('button', { name: 'Inspect state tick PG-8' })).toBeInTheDocument();
  });

  it('singularizes the count for a one-page run', () => {
    render(<UnscenedRunCard pageIds={['PG-7']} startPageId="PG-7" endPageId="PG-7" onSelectPage={vi.fn()} />);
    expect(screen.getByTestId('unscened-run-count')).toHaveTextContent('1 page');
  });

  it('invokes onSelectPage with the clicked tick page id', () => {
    const onSelectPage = vi.fn();
    render(<UnscenedRunCard pageIds={['PG-7', 'PG-8']} startPageId="PG-7" endPageId="PG-8" onSelectPage={onSelectPage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Inspect state tick PG-7' }));
    expect(onSelectPage).toHaveBeenCalledWith('PG-7');
  });
});
