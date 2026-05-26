import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../../../../lib/a11y-test-helpers';
import { ValidationIntegrityTab } from '../ValidationIntegrityTab';
import { demoIndexStatus, demoPageDetail } from '../../__tests__/a11y-fixtures';

describe('ValidationIntegrityTab a11y', () => {
  it('renders integrity chips and broken-reference buttons without axe violations', async () => {
    const { container } = render(
      <ValidationIntegrityTab
        pageDetail={demoPageDetail({
          validationIntegrity: {
            validationTrace: { hash_integrity: { verdict: 'PASS', rationale: 'receipt matched state hash' } },
            receiptVerdict: 'PASS',
            proseStatus: 'present',
            receiptPresence: 'present',
            stateHashStatus: 'match',
            planHashStatus: 'present',
            malformedYamlWarnings: [],
            skippedRecords: [],
            brokenRefs: ['STQ-404'],
          },
        })}
        worldIndexStatus={demoIndexStatus()}
      />,
    );

    expect(screen.getByLabelText('Integrity summary')).toHaveTextContent('State hash: match');
    expect(screen.getByRole('button', { name: 'Unresolved reference STQ-404. Copy record ID.' })).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });
});
