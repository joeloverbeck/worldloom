import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, PageSummary, ResponseEnvelope, StorySummary } from '../api/client';
import { getLatestPage, getRootPage, getStory } from '../api/client';
import { getLastViewedPage } from '../prefs/local-storage';
import { PageEntryRoute, pageEntryLoader } from './page-entry';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getStory: vi.fn(),
    getRootPage: vi.fn(),
    getLatestPage: vi.fn(),
  };
});

vi.mock('../prefs/local-storage', () => ({
  getLastViewedPage: vi.fn(),
}));

const mockedGetStory = vi.mocked(getStory);
const mockedGetRootPage = vi.mocked(getRootPage);
const mockedGetLatestPage = vi.mocked(getLatestPage);
const mockedGetLastViewedPage = vi.mocked(getLastViewedPage);

function indexStatus(kind: IndexStatus['kind'] = 'fresh'): IndexStatus {
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
      return { kind, driftedFiles: ['PG-1.yaml'], remedy: 'Run world-index sync fixture-world.' };
    case 'open_failed':
      return { kind, error: 'database is locked' };
  }
}

function story(overrides: Partial<StorySummary> = {}): StorySummary {
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
    ...overrides,
  };
}

function page(overrides: Partial<PageSummary> = {}): PageSummary {
  return {
    pageId: 'PG-1',
    branchId: 'BR-1',
    parentPageId: null,
    turnIndex: 1,
    choiceId: null,
    resolvedEventId: null,
    hasRenderedProse: true,
    hasPlan: true,
    hasReceipt: true,
    activeRecordCounts: {},
    childCount: 1,
    isLeaf: false,
    isTerminalOrPaused: false,
    terminalReason: null,
    ...overrides,
  };
}

async function renderPageEntryRoute(options: {
  rootPage?: PageSummary | null;
  latestPage?: PageSummary | null;
  lastViewedPageId?: string | null;
  selectedStory?: StorySummary;
  storyEnvelope?: ResponseEnvelope | null;
  rootPageEnvelope?: ResponseEnvelope | null;
  latestPageEnvelope?: ResponseEnvelope | null;
} = {}): Promise<ReturnType<typeof createMemoryRouter>> {
  mockedGetStory.mockResolvedValue({
    envelope: options.storyEnvelope ?? null,
    payload: options.selectedStory ?? story(),
  });
  mockedGetRootPage.mockResolvedValue({
    envelope: options.rootPageEnvelope ?? null,
    payload: options.rootPage ?? page({ pageId: 'PG-1' }),
  });
  mockedGetLatestPage.mockResolvedValue({
    envelope: options.latestPageEnvelope ?? null,
    payload: options.latestPage ?? page({ pageId: 'PG-12', isLeaf: true }),
  });
  mockedGetLastViewedPage.mockReturnValue(options.lastViewedPageId ?? null);

  const router = createMemoryRouter(
    [
      {
        path: '/worlds/:slug/stories/:storySlug/entry',
        loader: pageEntryLoader,
        element: <PageEntryRoute />,
      },
      {
        path: '/worlds/:slug/stories/:storySlug/pages/:pageId',
        element: <main>Reading page route</main>,
      },
    ],
    { initialEntries: ['/worlds/fixture-world/stories/red-bunny/entry'] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => expect(mockedGetStory).toHaveBeenCalledOnce());
  return router;
}

function envelope(worldIndexStatus: ResponseEnvelope['worldIndexStatus']): ResponseEnvelope {
  return {
    requestId: 'req-1',
    serverVersion: 'test',
    worldIndexStatus,
  };
}

beforeEach(() => {
  mockedGetStory.mockReset();
  mockedGetRootPage.mockReset();
  mockedGetLatestPage.mockReset();
  mockedGetLastViewedPage.mockReset();
});

describe('PageEntryRoute', () => {
  it('loads story metadata and page entry summaries for the current route params', async () => {
    await renderPageEntryRoute();

    expect(mockedGetStory).toHaveBeenCalledWith('fixture-world', 'red-bunny');
    expect(mockedGetRootPage).toHaveBeenCalledWith('fixture-world', 'red-bunny');
    expect(mockedGetLatestPage).toHaveBeenCalledWith('fixture-world', 'red-bunny');
    expect(mockedGetLastViewedPage).toHaveBeenCalledWith('red-bunny');
    expect(await screen.findByRole('heading', { name: 'Red Bunny' })).toBeInTheDocument();
  });

  it('navigates from the primary start-at-root action to the resolved root page', async () => {
    const router = await renderPageEntryRoute({ rootPage: page({ pageId: 'PG-1' }) });

    fireEvent.click(await screen.findByRole('link', { name: /Start at root PG-1/ }));

    expect(await screen.findByText('Reading page route')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/worlds/fixture-world/stories/red-bunny/pages/PG-1');
  });

  it('navigates from open-latest-leaf to the latest page returned by the API', async () => {
    const router = await renderPageEntryRoute({ latestPage: page({ pageId: 'PG-12', isLeaf: true }) });

    fireEvent.click(await screen.findByRole('link', { name: /Open latest leaf PG-12/ }));

    expect(await screen.findByText('Reading page route')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/worlds/fixture-world/stories/red-bunny/pages/PG-12');
  });

  it('hides open-last-viewed when no local preference exists', async () => {
    await renderPageEntryRoute({ lastViewedPageId: null });

    expect(await screen.findByRole('heading', { name: 'Red Bunny' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open last viewed/ })).not.toBeInTheDocument();
  });

  it('renders the page-entry index status banner before the entry actions', async () => {
    await renderPageEntryRoute({ rootPageEnvelope: envelope(indexStatus('stale')) });

    const banner = await screen.findByRole('status');
    const actionGroup = screen.getByLabelText('Entry points for Red Bunny');

    expect(banner).toHaveTextContent('1 file(s) drifted. Run world-index sync fixture-world.');
    expect(banner.compareDocumentPosition(actionGroup)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders open-last-viewed only when a local preference exists', async () => {
    const router = await renderPageEntryRoute({ lastViewedPageId: 'PG-7' });

    fireEvent.click(await screen.findByRole('link', { name: /Open last viewed PG-7/ }));

    expect(await screen.findByText('Reading page route')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/worlds/fixture-world/stories/red-bunny/pages/PG-7');
  });

  it('navigates to a typed page id from the choose-page form', async () => {
    const router = await renderPageEntryRoute();

    fireEvent.change(await screen.findByLabelText('Choose page'), { target: { value: 'pg-5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(await screen.findByText('Reading page route')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/worlds/fixture-world/stories/red-bunny/pages/PG-5');
  });

  it('rejects malformed choose-page input with an inline error', async () => {
    await renderPageEntryRoute();

    fireEvent.change(await screen.findByLabelText('Choose page'), { target: { value: 'not-a-page' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(await screen.findByText('Enter a page ID like PG-12.')).toBeInTheDocument();
    expect(screen.queryByText('Reading page route')).not.toBeInTheDocument();
  });
});
