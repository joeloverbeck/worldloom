import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../../../../lib/a11y-test-helpers';
import { ValidationIntegrityTab } from '../ValidationIntegrityTab';
import { demoIndexStatus, demoStateTickXray } from '../../__tests__/a11y-fixtures';

describe('ValidationIntegrityTab a11y', () => {
  it('renders integrity chips and broken-reference buttons without axe violations', async () => {
    const { container } = render(
      <ValidationIntegrityTab
        tick={demoStateTickXray({
          stateHash: 'sha256-x',
          parentStateHash: 'sha256-x',
          validationTrace: {
            hash_integrity: { verdict: 'PASS', rationale: 'receipt matched state hash' },
            broken_refs: ['STQ-404'],
          },
        })}
        worldIndexStatus={demoIndexStatus()}
      />,
    );

    expect(screen.getByLabelText('Integrity summary')).toHaveTextContent('State hash status: match');
    expect(screen.getByRole('button', { name: 'Unresolved reference STQ-404. Copy record ID.' })).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });
});
