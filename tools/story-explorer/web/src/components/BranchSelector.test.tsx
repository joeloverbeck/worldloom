import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BranchOverviewSummary } from '../api/client';
import { BranchSelector } from './BranchSelector';

function buildBranch(branchId: string): BranchOverviewSummary {
  return {
    branchId,
    rootPageId: 'PG-1',
    latestPageId: 'PG-9',
    latestScene: null,
  };
}

describe('BranchSelector', () => {
  it('renders an option per branch and reflects the selected branch', () => {
    render(
      <BranchSelector
        branches={[buildBranch('BR-1'), buildBranch('BR-2')]}
        selectedBranchId="BR-2"
        onSelect={vi.fn()}
      />,
    );

    const control = screen.getByLabelText('Active branch') as HTMLSelectElement;
    expect(control.value).toBe('BR-2');
    expect(screen.getByRole('option', { name: 'BR-1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'BR-2' })).toBeInTheDocument();
  });

  it('calls back with the chosen branch id', () => {
    const onSelect = vi.fn();
    render(
      <BranchSelector
        branches={[buildBranch('BR-1'), buildBranch('BR-2')]}
        selectedBranchId="BR-1"
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByLabelText('Active branch'), { target: { value: 'BR-2' } });
    expect(onSelect).toHaveBeenCalledWith('BR-2');
  });
});
