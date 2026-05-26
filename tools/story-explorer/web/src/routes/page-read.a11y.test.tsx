import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, PageDetail, StorySummary, WorldSummary } from '../api/client';
import { getPageDetail, getStory, getWorld } from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations, withReducedMotion } from '../lib/a11y-test-helpers';
import { PageReadRoute, pageReadLoader } from './page-read';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, getWorld: vi.fn(), getStory: vi.fn(), getPageDetail: vi.fn() };
});

const mockedGetWorld = vi.mocked(getWorld);
const mockedGetStory = vi.mocked(getStory);
const mockedGetPageDetail = vi.mocked(getPageDetail);

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

function pageDetail(): PageDetail {
  return {
    page: { id: 'PG-12', isLeaf: false, terminalReason: null },
    prose: 'The path opens toward moonlit trees.',
    proseStatus: 'present',
    pagePlanSummary: null,
    receiptSummary: null,
    choiceNavigation: [
      {
        choiceId: 'CHC-1',
        surfaceLabel: 'Follow the trail',
        playerVisibleIntent: 'Investigate the woods',
        pressure: ['scarcity'],
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
            hasRenderedProse: true,
            stateDeltaCounts: { create: 1, supersede: 0, close: 0 },
          },
        ],
        isNavigable: true,
      },
    ],
    currentStateRecordIds: [],
    eventDelta: {
      eventId: null,
      createCount: 0,
      supersedeCount: 0,
      closeCount: 0,
      introducedRecordIds: [],
      relationCount: 0,
    },
    validationIntegrity: { validationTrace: {}, receiptVerdict: 'PASS', proseStatus: 'present' },
    branchContext: { branchId: 'BR-3', branchPath: ['BR-1', 'BR-3'], parentPageId: 'PG-7', turnIndex: 12 },
    rawSources: [],
  };
}

async function renderRoute(): Promise<HTMLElement> {
  mockedGetWorld.mockResolvedValue({ envelope: null, payload: world() });
  mockedGetStory.mockResolvedValue({ envelope: null, payload: story() });
  mockedGetPageDetail.mockResolvedValue({ envelope: null, payload: pageDetail() });
  const router = createMemoryRouter(
    [{ path: '/worlds/:slug/stories/:storySlug/pages/:pageId', loader: pageReadLoader, element: <PageReadRoute /> }],
    { initialEntries: ['/worlds/fixture-world/stories/red-bunny/pages/PG-12'] },
  );
  const { container } = render(<RouterProvider router={router} />);
  await waitFor(() => expect(mockedGetPageDetail).toHaveBeenCalledOnce());
  return container;
}

beforeEach(() => {
  mockedGetWorld.mockReset();
  mockedGetStory.mockReset();
  mockedGetPageDetail.mockReset();
});

describe('PageReadRoute a11y', () => {
  it('has no axe violations in the composed reading route', async () => {
    const container = await renderRoute();

    assertHeadingHierarchy(container);
    await expectNoAxeViolations(container);
  });

  it('keeps the composed reading route accessible with reduced motion requested', async () => {
    await withReducedMotion(async () => {
      const container = await renderRoute();

      await expectNoAxeViolations(container);
    });
  });
});
