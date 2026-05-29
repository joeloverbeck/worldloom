import { useId } from 'react';

import type { BranchOverviewSummary } from '../api/client';

interface BranchSelectorProps {
  branches: BranchOverviewSummary[];
  selectedBranchId: string;
  onSelect: (branchId: string) => void;
}

export function BranchSelector({ branches, selectedBranchId, onSelect }: BranchSelectorProps): JSX.Element {
  const controlId = useId();

  return (
    <div className="branch-selector">
      <label className="branch-selector__label" htmlFor={controlId}>
        Active branch
      </label>
      <select
        id={controlId}
        className="branch-selector__control"
        value={selectedBranchId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {branches.map((branch) => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.branchId}
          </option>
        ))}
      </select>
    </div>
  );
}
