import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ChildOutcomeVariant } from './ChildOutcomeVariant';

describe('ChildOutcomeVariant a11y', () => {
  it('renders the outcome as a navigable link', async () => {
    const { container, getByRole } = renderForAxe(
      <ChildOutcomeVariant
        worldSlug="fixture-world"
        storySlug="red-bunny"
        variant={{
          pageId: 'PG-13',
          branchId: 'BR-3',
          turnIndex: 13,
          resolvedEventId: 'SE-13',
          outcomeRoute: 'success',
          resolutionPreview: null,
          selectedStoryletId: null,
          hasRenderedProse: true,
          stateDeltaCounts: { create: 1, supersede: 0, close: 0 },
        }}
      />,
    );

    expect(getByRole('link', { name: /PG-13 BR-3 success/ })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/pages/PG-13',
    );
    await expectNoAxeViolations(container);
  });
});
