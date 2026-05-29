import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EnvelopedResult, UnscenedRange, UnscenedRangeList } from '../api/client';
import * as client from '../api/client';
import { UnscenedRoute, unscenedLoader } from './unscened';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getUnscenedRanges: vi.fn(),
    // The StateTickDrawer (opened via ?focus) calls this; keep it inert so the
    // route tests stay focused on the unscened authoring surface.
    getStateTickXray: vi.fn(),
  };
});

const getUnscenedRangesMock = vi.mocked(client.getUnscenedRanges);

function fixtureRange(overrides: Partial<UnscenedRange> = {}): UnscenedRange {
  return {
    startPg: 'PG-3',
    endPg: 'PG-5',
    pageIds: ['PG-3', 'PG-4', 'PG-5'],
    count: 3,
    finalChoiceSurface: {
      pageId: 'PG-5',
      emittedChoices: [
        {
          choiceId: 'CHC-9',
          surfaceLabel: 'Confront the steward',
          playerVisibleIntent: 'Force the truth into the open',
          pressure: ['obligation'],
          groundedInCount: 2,
        },
      ],
    },
    eventDelta: {
      eventId: 'SE-12',
      createCount: 2,
      supersedeCount: 1,
      closeCount: 0,
      introducedRecordIds: ['STENT-4', 'BEL-2'],
      relationCount: 1,
    },
    activeRecordDelta: {
      startActiveRecordCounts: { STENT: 3, BEL: 1 },
      endActiveRecordCounts: { STENT: 4, BEL: 2 },
      createdRecordIds: ['STENT-4', 'BEL-2'],
      supersededRecordIds: ['BEL-1'],
      closedRecordIds: [],
    },
    validationStatus: {
      pageCount: 3,
      pagesWithValidationTrace: 2,
      verdict: 'present',
    },
    suggestedRangeLabel: 'PG-3 → PG-5',
    ...overrides,
  };
}

function buildUnscenedList(overrides: Partial<UnscenedRangeList> = {}): EnvelopedResult<UnscenedRangeList> {
  return {
    envelope: null,
    payload: {
      branchId: 'BR-1',
      ranges: [fixtureRange()],
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
        path: '/worlds/:slug/stories/:storySlug/unscened',
        loader: unscenedLoader,
        element: <UnscenedRoute />,
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

describe('unscenedLoader', () => {
  it('calls /unscened-ranges with no branch filter when the URL has no query', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList());

    await unscenedLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/unscened'),
      context: {},
    });

    expect(getUnscenedRangesMock).toHaveBeenCalledWith('aurelia', 'the-gathering', { branchId: undefined });
  });

  it('maps the ?branch shorthand onto SPEC-96 branchId', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList());

    await unscenedLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/unscened?branch=BR-2'),
      context: {},
    });

    expect(getUnscenedRangesMock).toHaveBeenCalledWith('aurelia', 'the-gathering', { branchId: 'BR-2' });
  });

  it('throws when the world or story slug is missing', async () => {
    await expect(
      unscenedLoader({
        params: { slug: 'aurelia' },
        request: new Request('http://localhost/worlds/aurelia/stories//unscened'),
        context: {},
      }),
    ).rejects.toThrow(/required to load unscened ranges/);
  });
});

describe('UnscenedRoute', () => {
  it('resolves at /worlds/:slug/stories/:storySlug/unscened and renders the branch heading', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList());

    renderRoute('/worlds/aurelia/stories/the-gathering/unscened');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Unscened ranges · BR-1' }),
    ).toBeInTheDocument();
  });

  it('renders an unscened range as a normal authoring view (range, deltas, choices, validation)', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList());

    renderRoute('/worlds/aurelia/stories/the-gathering/unscened');

    await screen.findByRole('heading', { level: 1, name: 'Unscened ranges · BR-1' });

    // PG range via the shared UnscenedRunCard.
    expect(screen.getByText('PG-3 → PG-5')).toBeInTheDocument();
    expect(screen.getByTestId('unscened-run-count')).toHaveTextContent('3 pages');

    // State-progression summary (active-record delta across the run).
    expect(screen.getByTestId('state-progression-totals')).toHaveTextContent('4 → 6 active records');
    expect(screen.getByTestId('state-progression-created')).toHaveTextContent('2');
    expect(screen.getByTestId('state-progression-superseded')).toHaveTextContent('1');
    expect(screen.getByTestId('state-progression-closed')).toHaveTextContent('0');

    // Event deltas (StateDeltaPanel reused).
    expect(screen.getByRole('heading', { level: 2, name: 'Event deltas' })).toBeInTheDocument();
    expect(screen.getByTestId('state-delta-create')).toHaveTextContent('2');

    // Emitted choices at the final PG.
    expect(screen.getByText('Confront the steward')).toBeInTheDocument();

    // Validation traces.
    expect(screen.getByTestId('validation-trace-summary')).toHaveTextContent(
      '2 of 3 pages carry a validation trace',
    );
    expect(screen.getByTestId('validation-trace-verdict')).toHaveTextContent('present');

    // Suggested range label is shown as a suggestion, not an automatic boundary verdict.
    expect(screen.getByTestId('suggested-range-label')).toHaveTextContent('Suggested label: PG-3 → PG-5');
  });

  it('shows the "no scene plan or prose yet" note and no prose-reader affordance', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList());

    renderRoute('/worlds/aurelia/stories/the-gathering/unscened');

    await screen.findByRole('heading', { level: 1, name: 'Unscened ranges · BR-1' });

    expect(screen.getByTestId('no-prose-note')).toHaveTextContent('No scene plan or prose yet.');

    // An unscened range is a normal authoring state, never a missing-scene
    // error: no error/alert framing and no prose-reader control.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /prose/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /read prose|open prose|render/i })).not.toBeInTheDocument();
  });

  it('renders an empty state when the branch has no unscened committed runs', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList({ ranges: [] }));

    renderRoute('/worlds/aurelia/stories/the-gathering/unscened');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No unscened committed runs on this branch.' }),
    ).toBeInTheDocument();
  });

  it('deep-links the state-tick x-ray drawer via ?focus when a PG is selected', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList());
    // Keep the drawer's x-ray fetch pending so the drawer stays in its loading
    // state; this test only asserts the ?focus deep-link, not x-ray content.
    vi.mocked(client.getStateTickXray).mockReturnValue(new Promise(() => undefined));

    const router = renderRoute('/worlds/aurelia/stories/the-gathering/unscened');

    await screen.findByRole('heading', { level: 1, name: 'Unscened ranges · BR-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Inspect state tick PG-3' }));

    await waitFor(() => expect(router.state.location.search).toContain('focus=PG-3'));
  });
});
