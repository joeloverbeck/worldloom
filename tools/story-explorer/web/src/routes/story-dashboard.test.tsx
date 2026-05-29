import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EnvelopedResult, StoryOverview } from '../api/client';
import * as client from '../api/client';
import { StoryDashboardRoute, storyDashboardLoader } from './story-dashboard';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getStoryOverview: vi.fn(),
  };
});

const getStoryOverviewMock = vi.mocked(client.getStoryOverview);

function buildOverview(overrides: Partial<StoryOverview> = {}): EnvelopedResult<StoryOverview> {
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
      ...overrides,
    },
  };
}

function renderRoute(): void {
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
  render(<RouterProvider router={router} />);
}

describe('StoryDashboardRoute', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves at /worlds/:slug/stories/:storySlug and renders the dashboard from the overview', async () => {
    getStoryOverviewMock.mockResolvedValue(buildOverview());

    renderRoute();

    expect(await screen.findByRole('heading', { level: 1, name: 'The Gathering' })).toBeInTheDocument();
    expect(screen.getByLabelText('Branch BR-1')).toBeInTheDocument();
    expect(screen.getByTestId('coverage-active-scenes')).toHaveTextContent('4');
    expect(getStoryOverviewMock).toHaveBeenCalledWith('aurelia', 'the-gathering');
  });

  it('surfaces the index-status banner from the response envelope', async () => {
    getStoryOverviewMock.mockResolvedValue({
      envelope: {
        requestId: 'r1',
        serverVersion: 'v1',
        worldIndexStatus: { kind: 'stale', driftedFiles: ['PG-1.yaml'], remedy: 'Rebuild the index.' },
      },
      payload: buildOverview().payload,
    });

    renderRoute();

    expect(await screen.findByText(/file\(s\) drifted/i)).toBeInTheDocument();
  });
});
