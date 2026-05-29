import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb a11y', () => {
  it('uses a named nav landmark and current location marker', async () => {
    const { container, getByRole, getByText } = renderForAxe(
      <Breadcrumb
        worldSlug="fixture-world"
        worldDisplayName="Fixture World"
        storySlug="red-bunny"
        storyTitle="Red Bunny"
        trail={[{ label: 'Scene SCN-3', href: '/worlds/fixture-world/stories/red-bunny/scenes/SCN-3' }]}
      />,
    );

    expect(getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(getByText('Scene SCN-3')).toHaveAttribute('aria-current', 'page');
    await expectNoAxeViolations(container);
  });
});
