import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, it, vi } from 'vitest';

import type { EnvelopedResult, UnscenedRange, UnscenedRangeList } from '../api/client';
import * as client from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { UnscenedRoute, unscenedLoader } from './unscened';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getUnscenedRanges: vi.fn(),
    getStateTickXray: vi.fn(),
  };
});

const getUnscenedRangesMock = vi.mocked(client.getUnscenedRanges);

function fixtureRange(): UnscenedRange {
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

function renderRoute(initialEntry: string): HTMLElement {
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
  return render(<RouterProvider router={router} />).container;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('UnscenedRoute a11y', () => {
  it('has no accessibility violations and a valid heading hierarchy with ranges', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList());

    const container = renderRoute('/worlds/aurelia/stories/the-gathering/unscened');

    await screen.findByRole('heading', { level: 1, name: 'Unscened ranges · BR-1' });
    await expectNoAxeViolations(container);
    assertHeadingHierarchy(container);
  });

  it('has no accessibility violations in the empty state', async () => {
    getUnscenedRangesMock.mockResolvedValue(buildUnscenedList({ ranges: [] }));

    const container = renderRoute('/worlds/aurelia/stories/the-gathering/unscened');

    await screen.findByRole('heading', { level: 2, name: 'No unscened committed runs on this branch.' });
    await expectNoAxeViolations(container);
    assertHeadingHierarchy(container);
  });
});
