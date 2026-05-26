import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb a11y', () => {
  it('uses a named nav landmark and current page marker', async () => {
    const { container, getByRole, getByText } = renderForAxe(
      <Breadcrumb
        worldSlug="fixture-world"
        worldDisplayName="Fixture World"
        storySlug="red-bunny"
        storyTitle="Red Bunny"
        branchId="BR-3"
        pageId="PG-12"
        parentPageId="PG-7"
      />,
    );

    expect(getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(getByText('PG-12')).toHaveAttribute('aria-current', 'page');
    await expectNoAxeViolations(container);
  });
});
