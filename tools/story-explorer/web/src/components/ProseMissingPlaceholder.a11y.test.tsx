import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ProseMissingPlaceholder } from './ProseMissingPlaceholder';

describe('ProseMissingPlaceholder a11y', () => {
  it('keeps the x-ray target disabled until SPEC-89 wires it', async () => {
    const { container, getByRole, getByText } = renderForAxe(<ProseMissingPlaceholder status="missing" />);

    expect(getByText('Rendered prose not attached yet.')).toBeInTheDocument();
    expect(getByRole('button', { name: 'View page plan in State X-Ray' })).toBeDisabled();
    await expectNoAxeViolations(container);
  });
});
