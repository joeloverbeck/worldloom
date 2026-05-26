import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BrokenReferenceChip } from '../BrokenReferenceChip';

describe('BrokenReferenceChip', () => {
  it('renders an unresolved-reference chip and copies the cited ID', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<BrokenReferenceChip recordId="BEL-404" />);

    const chip = screen.getByRole('button', { name: 'Unresolved reference BEL-404. Copy record ID.' });
    expect(chip).toHaveTextContent('Unresolved reference: BEL-404');

    fireEvent.click(chip);

    expect(writeText).toHaveBeenCalledWith('BEL-404');
  });
});
