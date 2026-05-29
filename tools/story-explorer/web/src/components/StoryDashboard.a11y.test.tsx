import { screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import type { StoryOverview } from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { StoryDashboard } from './StoryDashboard';

function buildOverview(): StoryOverview {
  return {
    worldSlug: 'aurelia',
    storySlug: 'the-gathering',
    storyId: 'STORY-1',
    title: 'The Gathering',
    rootPageId: 'PG-1',
    latestPageId: 'PG-12',
    branchCount: 1,
    pageCount: 12,
    choiceCount: 8,
    branches: [
      {
        branchId: 'BR-1',
        rootPageId: 'PG-1',
        latestPageId: 'PG-9',
        latestScene: { sceneId: 'SCN-3', publicationState: 'attached:PASS' },
      },
    ],
    sceneCoverageCounts: {
      status: 'available',
      activeSceneCount: 4,
      supersededSceneCount: 1,
      totalSceneCount: 5,
    },
    unscenedRunCounts: { status: 'available', runCount: 2, pageCount: 7 },
    indexStatus: { kind: 'fresh', version: 1 },
    degradedDirectRead: false,
  };
}

describe('StoryDashboard a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderForAxe(<StoryDashboard overview={buildOverview()} indexStatusBanner={null} />);
    await screen.findByRole('heading', { level: 1 });
    assertHeadingHierarchy(container);
    await expectNoAxeViolations(container);
  });
});
