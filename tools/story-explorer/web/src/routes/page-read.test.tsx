import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, PageDetail, StorySummary, WorldSummary } from '../api/client';
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

function indexStatus(): IndexStatus {
  return { kind: 'fresh', version: 1 };
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
    page: { id: 'PG-12' },
    prose: null,
    proseStatus: 'missing',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [],
    currentStateRecordIds: ['CAST-1'],
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

async function renderPageReadRoute(detail = pageDetail()): Promise<void> {
  mockedGetWorld.mockResolvedValue({ envelope: null, payload: world() });
  mockedGetStory.mockResolvedValue({ envelope: null, payload: story() });
  mockedGetPageDetail.mockResolvedValue({ envelope: null, payload: detail });

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
    expect(screen.getByText('Prose panel slot (T009 fills)')).toBeInTheDocument();
    expect(screen.getByText('Choice cards slot (T010 fills)')).toBeInTheDocument();
    expect(screen.getByText('Terminal card slot (T010 fills)')).toBeInTheDocument();
    expect(screen.getByText('State X-Ray slot (SPEC-89 fills)')).toBeInTheDocument();
    expect(screen.getByText('Summary rail slot (SPEC-89 fills)')).toBeInTheDocument();
  });

  it('omits the terminal slot when a navigable child choice exists', async () => {
    await renderPageReadRoute(
      pageDetail({
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
        ],
      }),
    );

    expect(screen.queryByText('Terminal card slot (T010 fills)')).not.toBeInTheDocument();
  });
});
