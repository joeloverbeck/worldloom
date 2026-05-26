import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '../../../lib/a11y-test-helpers';
import { XRayGroup } from '../XRayGroup';
import { card } from './a11y-fixtures';

describe('XRayGroup a11y', () => {
  it('renders a heading-contained disclosure button without axe violations', async () => {
    const { container } = render(
      <XRayGroup group="Knowledge & Truth" records={[card('BEL-1')]}>
        <p>Knowledge record content</p>
      </XRayGroup>,
    );

    const heading = screen.getByRole('heading', { level: 3 });
    const trigger = screen.getByRole('button', { name: 'Knowledge & Truth · 1 active' });
    expect(heading).toContainElement(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(trigger, { key: ' ' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await expectNoAxeViolations(container);
  });
});
