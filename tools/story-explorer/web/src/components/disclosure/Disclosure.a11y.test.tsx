import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../../lib/a11y-test-helpers';
import { Disclosure } from './Disclosure';

describe('Disclosure a11y', () => {
  it('provides aria-expanded and aria-controls for collapsible content', async () => {
    const { container, getByRole, getByText } = renderForAxe(
      <Disclosure>
        {(state) => (
          <section>
            <button type="button" {...state.triggerProps}>
              Toggle records
            </button>
            <div {...state.contentProps}>Hidden records</div>
          </section>
        )}
      </Disclosure>,
    );

    const button = getByRole('button', { name: 'Toggle records' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(getByText('Hidden records')).not.toHaveAttribute('hidden');
    await expectNoAxeViolations(container);
  });
});
