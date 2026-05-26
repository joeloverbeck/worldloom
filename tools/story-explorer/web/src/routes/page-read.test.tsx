import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, PageDetail, ResponseEnvelope, StorySummary, WorldSummary } from '../api/client';
import { getPageDetail, getStory, getWorld } from '../api/client';
import { PageReadRoute, pageReadLoader } from './page-read';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getWorld: vi.fn(),
    getStory: vi.fn(),
    getPageDetail: vi.fn(),
  };
});

const mockedGetWorld = vi.mocked(getWorld);
const mockedGetStory = vi.mocked(getStory);
const mockedGetPageDetail = vi.mocked(getPageDetail);

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
      return { kind, driftedFiles: ['PG-12.yaml'], remedy: 'Run world-index sync fixture-world.' };
    case 'open_failed':
      return { kind, error: 'database is locked' };
  }
}

function world(overrides: Partial<WorldSummary> = {}): WorldSummary {
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
    ...overrides,
  };
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

function pageDetail(overrides: Partial<PageDetail> = {}): PageDetail {
  return {
    page: { id: 'PG-12', isLeaf: true, terminalReason: 'no_children' },
    prose: null,
    proseStatus: 'missing',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [],
    currentStateRecordIds: [],
    eventDelta: {
      eventId: null,
      createCount: 0,
      supersedeCount: 0,
      closeCount: 0,
      introducedRecordIds: [],
      relationCount: 0,
    },
    validationIntegrity: {
      validationTrace: {},
      receiptVerdict: 'PASS',
      proseStatus: 'present',
    },
    branchContext: {
      branchId: 'BR-3',
      branchPath: ['BR-1', 'BR-3'],
      parentPageId: 'PG-7',
      turnIndex: 12,
    },
    rawSources: [],
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

async function renderPageReadRoute(
  detail = pageDetail(),
  pageDetailEnvelope: ResponseEnvelope | null = null,
): Promise<void> {
  mockedGetWorld.mockResolvedValue({ envelope: null, payload: world() });
  mockedGetStory.mockResolvedValue({ envelope: null, payload: story() });
  mockedGetPageDetail.mockResolvedValue({ envelope: pageDetailEnvelope, payload: detail });

  const router = createMemoryRouter(
    [
      {
        path: '/worlds/:slug/stories/:storySlug/pages/:pageId',
        loader: pageReadLoader,
        element: <PageReadRoute />,
      },
    ],
    { initialEntries: ['/worlds/fixture-world/stories/red-bunny/pages/PG-12'] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => expect(mockedGetPageDetail).toHaveBeenCalledOnce());
}

beforeEach(() => {
  mockedGetWorld.mockReset();
  mockedGetStory.mockReset();
  mockedGetPageDetail.mockReset();
});

describe('PageReadRoute', () => {
  it('loads world, story, and page detail for the current route params', async () => {
    await renderPageReadRoute();

    expect(mockedGetWorld).toHaveBeenCalledWith('fixture-world');
    expect(mockedGetStory).toHaveBeenCalledWith('fixture-world', 'red-bunny');
    expect(mockedGetPageDetail).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'PG-12');
    expect(await screen.findByRole('heading', { name: 'Red Bunny' })).toBeInTheDocument();
  });

  it('renders header, breadcrumb, and reading sections in order', async () => {
    await renderPageReadRoute();

    const main = await screen.findByRole('main');
    const sectionHeadings = within(main).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(sectionHeadings).toEqual(['Prose', 'Choices', 'Continuation', 'State X-Ray', 'Summary']);
    expect(screen.getByText('Rendered prose not attached yet.')).toBeInTheDocument();
    expect(screen.getByText('No navigable choices from this page.')).toBeInTheDocument();
    expect(screen.getByText('No committed continuation from this page.')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'State X-Ray tabs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Current State' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Summary rail slot (SPEC-89 fills)')).toBeInTheDocument();
  });

  it('renders the page-detail index status banner before the reading layout', async () => {
    await renderPageReadRoute(pageDetail(), envelope(indexStatus('open_failed')));

    const banner = await screen.findByRole('status');
    const layout = document.querySelector('.reading-layout');

    expect(banner).toHaveTextContent('Index could not be opened. database is locked');
    expect(layout).not.toBeNull();
    expect(banner.compareDocumentPosition(layout as Element)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders only navigable choices and omits terminal card when a child exists', async () => {
    await renderPageReadRoute(
      pageDetail({
        page: { id: 'PG-12', isLeaf: false, terminalReason: null },
        choiceNavigation: [
          {
            choiceId: 'CHC-1',
            surfaceLabel: 'Follow the trail',
            playerVisibleIntent: 'Investigate the woods',
            pressure: [],
            groundedInCount: 1,
            childOutcomeVariants: [
              {
                pageId: 'PG-13',
                branchId: 'BR-3',
                turnIndex: 13,
                resolvedEventId: 'SE-13',
                outcomeRoute: 'success',
                resolutionPreview: null,
                selectedStoryletId: null,
                hasRenderedProse: false,
                stateDeltaCounts: { create: 0, supersede: 0, close: 0 },
              },
            ],
            isNavigable: true,
          },
          {
            choiceId: 'CHC-2',
            surfaceLabel: 'Wait for a sign',
            playerVisibleIntent: 'Hold position',
            pressure: [],
            groundedInCount: 0,
            childOutcomeVariants: [],
            isNavigable: false,
          },
        ],
      }),
    );

    expect(screen.getByRole('link', { name: /Follow the trail/i })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/pages/PG-13',
    );
    expect(screen.queryByText('Wait for a sign')).not.toBeInTheDocument();
    expect(screen.queryByText('No committed continuation from this page.')).not.toBeInTheDocument();
  });
});
