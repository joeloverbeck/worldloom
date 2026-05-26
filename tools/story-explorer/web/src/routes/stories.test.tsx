import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, ResponseEnvelope, StorySummary, WorldSummary } from '../api/client';
import { getWorld, listStories } from '../api/client';
import { StoriesRoute, storyListLoader, storyStatusBadge } from './stories';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getWorld: vi.fn(),
    listStories: vi.fn(),
  };
});

const mockedGetWorld = vi.mocked(getWorld);
const mockedListStories = vi.mocked(listStories);

function indexStatus(kind: IndexStatus['kind']): IndexStatus {
  switch (kind) {
    case 'fresh':
      return { kind, version: 1 };
    case 'missing':
      return { kind, remedy: 'Run world-index build fixture-world.' };
    case 'version_mismatch':
      return { kind, expected: 2, found: 1, remedy: 'Rebuild the index.' };
    case 'empty':
      return { kind, remedy: 'Add story records.' };
    case 'stale':
      return { kind, driftedFiles: ['STORY_KERNEL.md'], remedy: 'Run world-index sync fixture-world.' };
    case 'open_failed':
      return { kind, error: 'database is locked' };
  }
}

function world(overrides: Partial<WorldSummary> = {}): WorldSummary {
  return {
    worldSlug: 'fixture-world',
    displayName: 'Fixture World',
    path: 'worlds/fixture-world',
    indexStatus: indexStatus('fresh'),
    storyCount: 2,
    hasWorldDb: true,
    indexVersion: 1,
    driftedFiles: [],
    errors: [],
    ...overrides,
  };
}

function story(overrides: Partial<StorySummary>): StorySummary {
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
    indexStatus: indexStatus('fresh'),
    ...overrides,
  };
}

function envelope(worldIndexStatus: ResponseEnvelope['worldIndexStatus']): ResponseEnvelope {
  return {
    requestId: 'req-1',
    serverVersion: 'test',
    worldIndexStatus,
  };
}

async function renderStoriesRoute(
  stories: StorySummary[],
  selectedWorld = world(),
  storiesEnvelope: ResponseEnvelope | null = null,
  worldEnvelope: ResponseEnvelope | null = null,
): Promise<void> {
  mockedGetWorld.mockResolvedValue({
    envelope: worldEnvelope,
    payload: selectedWorld,
  });
  mockedListStories.mockResolvedValue({
    envelope: storiesEnvelope,
    payload: stories,
  });

  const router = createMemoryRouter(
    [
      {
        path: '/worlds/:slug/stories',
        loader: storyListLoader,
        element: <StoriesRoute />,
      },
      {
        path: '/worlds/:slug/stories/:storySlug/entry',
        element: <main>Story entry route</main>,
      },
    ],
    { initialEntries: ['/worlds/fixture-world/stories'] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => expect(mockedListStories).toHaveBeenCalledOnce());
}

beforeEach(() => {
  mockedGetWorld.mockReset();
  mockedListStories.mockReset();
});

describe('StoriesRoute', () => {
  it('renders one card per story with metadata from the API', async () => {
    await renderStoriesRoute([
      story({ storySlug: 'red-bunny', title: 'Red Bunny', pageCount: 12, leafPageIds: ['PG-9', 'PG-12'] }),
      story({
        storySlug: 'blue-door',
        title: null,
        pageCount: 1,
        leafPageIds: ['PG-1'],
        renderedProseCount: 0,
        latestPageId: null,
      }),
    ]);

    expect(await screen.findByRole('heading', { name: 'Fixture World Stories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Red Bunny/ })).toHaveTextContent('red-bunny');
    expect(screen.getByRole('link', { name: /Red Bunny/ })).toHaveTextContent('12 pages');
    expect(screen.getByRole('link', { name: /Red Bunny/ })).toHaveTextContent('2 leaves');
    expect(screen.getByRole('link', { name: /Red Bunny/ })).toHaveTextContent('5 prose pages');
    expect(screen.getByRole('link', { name: /Red Bunny/ })).toHaveTextContent('Latest: PG-12');
    expect(screen.getByRole('link', { name: /Red Bunny/ })).toHaveTextContent('Indexed');
    expect(screen.getByRole('link', { name: /Untitled story/ })).toHaveTextContent('Latest: none indexed');
  });

  it('renders the empty story-list state with the bootstrap hint', async () => {
    await renderStoriesRoute([]);

    expect(await screen.findByText('No story bundles under this world.')).toBeInTheDocument();
    expect(screen.getByText('/branching-story-bootstrap')).toBeInTheDocument();
  });

  it('warns when PG-1 is missing without disabling navigation', async () => {
    await renderStoriesRoute([story({ rootPageId: null })]);

    const card = await screen.findByRole('link', { name: /Red Bunny/ });

    expect(card).toHaveTextContent('PG-1 missing');
    expect(card).toHaveAttribute('href', '/worlds/fixture-world/stories/red-bunny/entry');
  });

  it('maps every story index status to deterministic card labels', () => {
    expect(storyStatusBadge(indexStatus('fresh'))).toMatchObject({ label: 'Indexed' });
    expect(storyStatusBadge(indexStatus('missing'))).toMatchObject({ label: 'Missing index' });
    expect(storyStatusBadge(indexStatus('stale'))).toMatchObject({ label: 'Stale index' });
    expect(storyStatusBadge(indexStatus('empty'))).toMatchObject({ label: 'Empty world' });
    expect(storyStatusBadge(indexStatus('version_mismatch'))).toMatchObject({ label: 'Error' });
    expect(storyStatusBadge(indexStatus('open_failed'))).toMatchObject({ label: 'Error' });
  });

  it('renders the world-level index status banner before the story list', async () => {
    await renderStoriesRoute([story({})], world(), envelope(indexStatus('stale')));

    const banner = await screen.findByRole('status');
    const list = screen.getByRole('list', { name: 'Stories in Fixture World' });

    expect(banner).toHaveTextContent('1 file(s) drifted. Run world-index sync fixture-world.');
    expect(banner.compareDocumentPosition(list)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('falls back to the world envelope when the story-list envelope has no index status', async () => {
    await renderStoriesRoute([story({})], world(), envelope(null), envelope(indexStatus('open_failed')));

    expect(await screen.findByRole('status')).toHaveTextContent('Index could not be opened. database is locked');
  });

  it('uses links to navigate to the selected story entry route', async () => {
    await renderStoriesRoute([story({ storySlug: 'red bunny' })]);

    fireEvent.click(await screen.findByRole('link', { name: /Red Bunny/ }));

    expect(await screen.findByText('Story entry route')).toBeInTheDocument();
  });
});
