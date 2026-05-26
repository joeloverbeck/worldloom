import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ValidationIntegritySummary } from '../api/client';
import { IntegrityChip } from './IntegrityChip';

function integrity(overrides: Partial<ValidationIntegritySummary> = {}): ValidationIntegritySummary {
  return {
    validationTrace: {},
    receiptVerdict: 'PASS',
    proseStatus: 'present',
    ...overrides,
  };
}

describe('IntegrityChip', () => {
  it('renders clean integrity state and expands the summary popover', () => {
    render(<IntegrityChip validationIntegrity={integrity()} />);

    const chip = screen.getByRole('button', { name: /Integrity clean/ });
    expect(chip).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(chip);

    expect(chip).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Prose: present')).toBeInTheDocument();
    expect(screen.getByText('Receipt: PASS')).toBeInTheDocument();
  });

  it('dispatches warnings and broken states from the validation summary', () => {
    const { rerender } = render(<IntegrityChip validationIntegrity={integrity({ proseStatus: 'missing' })} />);

    expect(screen.getByRole('button', { name: /Integrity warning/ })).toBeInTheDocument();

    rerender(<IntegrityChip validationIntegrity={integrity({ proseStatus: 'hash_mismatch' })} />);

    expect(screen.getByRole('button', { name: /Integrity issue/ })).toBeInTheDocument();
  });
});
