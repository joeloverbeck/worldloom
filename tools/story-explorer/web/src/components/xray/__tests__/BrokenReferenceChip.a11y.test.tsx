import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { BrokenReferenceChip } from '../BrokenReferenceChip';

describe('BrokenReferenceChip a11y', () => {
  it('uses an accessible label for unresolved references', async () => {
    const { container } = render(<BrokenReferenceChip recordId="STQ-404" />);

    expect(screen.getByRole('button', { name: 'Unresolved reference STQ-404. Copy record ID.' })).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });
});
