import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage a11y', () => {
  it('names the alert and provides a story-root recovery link', async () => {
    const { container, getByRole } = renderForAxe(
      <NotFoundPage worldSlug="fixture-world" storySlug="red-bunny" />,
    );

    expect(getByRole('alert')).toHaveAccessibleName('Resource not found.');
    expect(getByRole('link', { name: 'Back to story root' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny',
    );
    await expectNoAxeViolations(container);
  });
});
