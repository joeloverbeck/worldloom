import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EnvelopedResult, StoryOverview } from '../api/client';
import * as client from '../api/client';
import { expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { StoryDashboardRoute, storyDashboardLoader } from './story-dashboard';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getStoryOverview: vi.fn(),
  };
});

const getStoryOverviewMock = vi.mocked(client.getStoryOverview);

function buildOverview(): EnvelopedResult<StoryOverview> {
  return {
    envelope: null,
    payload: {
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
    },
  };
}

describe('StoryDashboardRoute a11y', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    getStoryOverviewMock.mockResolvedValue(buildOverview());

    const router = createMemoryRouter(
      [
        {
          path: '/worlds/:slug/stories/:storySlug',
          loader: storyDashboardLoader,
          element: <StoryDashboardRoute />,
        },
      ],
      { initialEntries: ['/worlds/aurelia/stories/the-gathering'] },
    );

    const { container } = render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { level: 1 });
    await expectNoAxeViolations(container);
  });
});
