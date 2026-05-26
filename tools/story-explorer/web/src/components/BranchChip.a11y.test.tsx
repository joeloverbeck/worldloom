import { describe, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { BranchChip } from './BranchChip';

describe('BranchChip a11y', () => {
  it('labels the branch button', async () => {
    const { container, getByRole } = renderForAxe(<BranchChip branchId="BR-3" />);

    getByRole('button', { name: 'Branch BR-3' });
    await expectNoAxeViolations(container);
  });
});
