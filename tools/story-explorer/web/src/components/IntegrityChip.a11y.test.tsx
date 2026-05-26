import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { IntegrityChip } from './IntegrityChip';

describe('IntegrityChip a11y', () => {
  it('wires the disclosure state to the popover', async () => {
    const { container, getByRole } = renderForAxe(
      <IntegrityChip validationIntegrity={{ validationTrace: {}, receiptVerdict: 'PASS', proseStatus: 'present' }} />,
    );

    const button = getByRole('button', { name: /Integrity clean/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    getByRole('status');
    await expectNoAxeViolations(container);
  });
});
