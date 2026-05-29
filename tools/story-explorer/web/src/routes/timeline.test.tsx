import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BranchTimeline, EnvelopedResult, StateTickXray, TimelineSegment } from '../api/client';
import * as client from '../api/client';
import { demoStateTickXray } from '../components/xray/__tests__/a11y-fixtures';
import { TimelineRoute, timelineLoader } from './timeline';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getBranchTimeline: vi.fn(),
    getStateTickXray: vi.fn(),
  };
});

const getBranchTimelineMock = vi.mocked(client.getBranchTimeline);
const getStateTickXrayMock = vi.mocked(client.getStateTickXray);

function fixtureSegments(): TimelineSegment[] {
  return [
    {
      kind: 'scene_segment',
      sceneId: 'SCN-1',
      pageIds: ['PG-1', 'PG-2'],
      startPageId: 'PG-1',
      endPageId: 'PG-2',
      publicationState: 'attached:PASS',
      focused: false,
    },
    { kind: 'unscened_run', pageIds: ['PG-3'], startPageId: 'PG-3', endPageId: 'PG-3', focused: false },
    {
      kind: 'choice_surface',
      pageId: 'PG-3',
      choiceSurface: {
        pageId: 'PG-3',
        emittedChoices: [
          { choiceId: 'CHC-1', surfaceLabel: 'Go on', playerVisibleIntent: 'Advance', pressure: [], groundedInCount: 1 },
        ],
      },
      focused: false,
    },
    { kind: 'branch_split', pageId: 'PG-3', childBranchIds: ['BR-2'], focused: false },
    { kind: 'terminal_marker', pageId: 'PG-4', reason: 'no_children', focused: false },
  ];
}

function buildTimeline(overrides: Partial<BranchTimeline> = {}): EnvelopedResult<BranchTimeline> {
  return {
    envelope: null,
    payload: {
      branchId: 'BR-1',
      segments: fixtureSegments(),
      focus: null,
      indexStatus: { kind: 'fresh', version: 1 },
      degradedDirectRead: false,
      ...overrides,
    },
  };
}

function renderRoute(initialEntry: string): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter(
    [
      {
        path: '/worlds/:slug/stories/:storySlug/timeline',
        loader: timelineLoader,
        element: <TimelineRoute />,
      },
    ],
    { initialEntries: [initialEntry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('timelineLoader', () => {
  it('maps ?branch and ?focus to the /timeline branchId/focus query', async () => {
    getBranchTimelineMock.mockResolvedValue(buildTimeline());

    await timelineLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/timeline?branch=BR-2&focus=PG-3'),
      context: {},
    });

    expect(getBranchTimelineMock).toHaveBeenCalledWith('aurelia', 'the-gathering', {
      branchId: 'BR-2',
      focus: 'PG-3',
    });
  });

  it('re-queries /timeline for a different branchId on branch switch', async () => {
    getBranchTimelineMock.mockResolvedValue(buildTimeline({ branchId: 'BR-9' }));

    await timelineLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/timeline?branch=BR-9'),
      context: {},
    });

    expect(getBranchTimelineMock).toHaveBeenCalledWith('aurelia', 'the-gathering', {
      branchId: 'BR-9',
      focus: undefined,
    });
  });
});

describe('TimelineRoute', () => {
  it('renders the ordered segment payload at the timeline route', async () => {
    getBranchTimelineMock.mockResolvedValue(buildTimeline());

    renderRoute('/worlds/aurelia/stories/the-gathering/timeline?branch=BR-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Branch timeline · BR-1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'SCN-1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Branch split at PG-3')).toBeInTheDocument();
    expect(screen.getByLabelText('Terminal marker at PG-4')).toBeInTheDocument();
  });

  it('opens the state-tick drawer and sets ?focus=PG-N when a PG tick is clicked', async () => {
    getBranchTimelineMock.mockResolvedValue(buildTimeline());
    getStateTickXrayMock.mockResolvedValue({
      envelope: null,
      payload: demoStateTickXray({ pageId: 'PG-1' }) as StateTickXray,
    });

    const router = renderRoute('/worlds/aurelia/stories/the-gathering/timeline?branch=BR-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Inspect state tick PG-1' }));

    await waitFor(() => expect(getStateTickXrayMock).toHaveBeenCalledWith('aurelia', 'the-gathering', 'PG-1'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'State X-Ray · PG-1' })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toContain('focus=PG-1'));
  });

  it('opens the drawer on load from a preset ?focus deep link', async () => {
    getBranchTimelineMock.mockResolvedValue(buildTimeline());
    getStateTickXrayMock.mockResolvedValue({
      envelope: null,
      payload: demoStateTickXray({ pageId: 'PG-2' }) as StateTickXray,
    });

    renderRoute('/worlds/aurelia/stories/the-gathering/timeline?branch=BR-1&focus=PG-2');

    await waitFor(() => expect(getStateTickXrayMock).toHaveBeenCalledWith('aurelia', 'the-gathering', 'PG-2'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'State X-Ray · PG-2' })).toBeInTheDocument();
  });
});
