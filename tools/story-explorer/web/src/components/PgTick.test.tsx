import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PgTick } from './PgTick';

describe('PgTick', () => {
  it('renders the page id and invokes onSelect with the page id when clicked', () => {
    const onSelect = vi.fn();
    render(<PgTick pageId="PG-7" onSelect={onSelect} />);

    const tick = screen.getByRole('button', { name: 'Inspect state tick PG-7' });
    expect(tick).toHaveTextContent('PG-7');

    fireEvent.click(tick);
    expect(onSelect).toHaveBeenCalledWith('PG-7');
  });

  it('marks the focused tick with aria-current', () => {
    render(<PgTick pageId="PG-7" onSelect={vi.fn()} focused />);
    expect(screen.getByRole('button', { name: 'Inspect state tick PG-7' })).toHaveAttribute('aria-current', 'true');
  });

  it('omits aria-current when not focused', () => {
    render(<PgTick pageId="PG-7" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Inspect state tick PG-7' })).not.toHaveAttribute('aria-current');
  });
});
