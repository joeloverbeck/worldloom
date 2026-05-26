import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, StorySummary, WorldSummary } from '../api/client';
import { getWorld, listStories } from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { StoriesRoute, storyListLoader } from './stories';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, getWorld: vi.fn(), listStories: vi.fn() };
});

const mockedGetWorld = vi.mocked(getWorld);
const mockedListStories = vi.mocked(listStories);

function indexStatus(): IndexStatus {
  return { kind: 'fresh', version: 1 };
}

function world(): WorldSummary {
  return {
    worldSlug: 'fixture-world',
    displayName: 'Fixture World',
    path: 'worlds/fixture-world',
    indexStatus: indexStatus(),
    storyCount: 1,
    hasWorldDb: true,
    indexVersion: 1,
    driftedFiles: [],
    errors: [],
  };
}

function story(): StorySummary {
  return {
    worldSlug: 'fixture-world',
    storySlug: 'red-bunny',
    storyId: 'STORY-red-bunny',
    title: 'Red Bunny',
    kernelPath: 'worlds/fixture-world/stories/red-bunny/STORY_KERNEL.md',
    pageCount: 12,
    choiceCount: 8,
    branchCount: 3,
    renderedProseCount: 5,
    leafPageIds: ['PG-9', 'PG-12'],
    rootPageId: 'PG-1',
    latestPageId: 'PG-12',
    indexStatus: indexStatus(),
  };
}

beforeEach(() => {
  mockedGetWorld.mockReset();
  mockedListStories.mockReset();
});

describe('StoriesRoute a11y', () => {
  it('has no axe violations in the composed story picker route', async () => {
    mockedGetWorld.mockResolvedValue({ envelope: null, payload: world() });
    mockedListStories.mockResolvedValue({ envelope: null, payload: [story()] });
    const router = createMemoryRouter([{ path: '/worlds/:slug/stories', loader: storyListLoader, element: <StoriesRoute /> }], {
      initialEntries: ['/worlds/fixture-world/stories'],
    });
    const { container } = render(<RouterProvider router={router} />);
    await waitFor(() => expect(mockedListStories).toHaveBeenCalledOnce());

    assertHeadingHierarchy(container);
    await expectNoAxeViolations(container);
  });
});
