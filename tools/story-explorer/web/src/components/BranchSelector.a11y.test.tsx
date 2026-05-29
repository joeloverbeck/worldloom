import { describe, it, vi } from 'vitest';

import type { BranchOverviewSummary } from '../api/client';
import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { BranchSelector } from './BranchSelector';

function buildBranch(branchId: string): BranchOverviewSummary {
  return { branchId, rootPageId: 'PG-1', latestPageId: 'PG-9', latestScene: null };
}

describe('BranchSelector a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderForAxe(
      <BranchSelector
        branches={[buildBranch('BR-1'), buildBranch('BR-2')]}
        selectedBranchId="BR-1"
        onSelect={vi.fn()}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
