import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, PageSummary, StorySummary } from '../api/client';
import { getLatestPage, getRootPage, getStory } from '../api/client';
import { getLastViewedPage } from '../prefs/local-storage';
import { assertHeadingHierarchy, expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { PageEntryRoute, pageEntryLoader } from './page-entry';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, getStory: vi.fn(), getRootPage: vi.fn(), getLatestPage: vi.fn() };
});

vi.mock('../prefs/local-storage', () => ({ getLastViewedPage: vi.fn() }));

const mockedGetStory = vi.mocked(getStory);
const mockedGetRootPage = vi.mocked(getRootPage);
const mockedGetLatestPage = vi.mocked(getLatestPage);
const mockedGetLastViewedPage = vi.mocked(getLastViewedPage);

function indexStatus(): IndexStatus {
  return { kind: 'fresh', version: 1 };
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

function page(pageId: string, isLeaf: boolean): PageSummary {
  return {
    pageId,
    branchId: 'BR-1',
    parentPageId: null,
    turnIndex: 1,
    choiceId: null,
    resolvedEventId: null,
    hasRenderedProse: true,
    hasPlan: true,
    hasReceipt: true,
    activeRecordCounts: {},
    childCount: isLeaf ? 0 : 1,
    isLeaf,
    isTerminalOrPaused: isLeaf,
    terminalReason: isLeaf ? 'no_children' : null,
  };
}

beforeEach(() => {
  mockedGetStory.mockReset();
  mockedGetRootPage.mockReset();
  mockedGetLatestPage.mockReset();
  mockedGetLastViewedPage.mockReset();
});

describe('PageEntryRoute a11y', () => {
  it('has no axe violations in the composed page-entry route', async () => {
    mockedGetStory.mockResolvedValue({ envelope: null, payload: story() });
    mockedGetRootPage.mockResolvedValue({ envelope: null, payload: page('PG-1', false) });
    mockedGetLatestPage.mockResolvedValue({ envelope: null, payload: page('PG-12', true) });
    mockedGetLastViewedPage.mockReturnValue('PG-7');
    const router = createMemoryRouter(
      [{ path: '/worlds/:slug/stories/:storySlug/entry', loader: pageEntryLoader, element: <PageEntryRoute /> }],
      { initialEntries: ['/worlds/fixture-world/stories/red-bunny/entry'] },
    );
    const { container } = render(<RouterProvider router={router} />);
    await waitFor(() => expect(mockedGetStory).toHaveBeenCalledOnce());

    assertHeadingHierarchy(container);
    await expectNoAxeViolations(container);
  });
});
