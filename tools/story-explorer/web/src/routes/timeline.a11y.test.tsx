import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BranchTimeline, EnvelopedResult, StateTickXray } from '../api/client';
import * as client from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations } from '../lib/a11y-test-helpers';
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

function buildTimeline(): EnvelopedResult<BranchTimeline> {
  return {
    envelope: null,
    payload: {
      branchId: 'BR-1',
      segments: [
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
              { choiceId: 'CHC-1', surfaceLabel: 'Go on', playerVisibleIntent: 'Advance', pressure: ['urgency'], groundedInCount: 1 },
            ],
          },
          focused: false,
        },
        { kind: 'branch_split', pageId: 'PG-3', childBranchIds: ['BR-2'], focused: false },
        { kind: 'terminal_marker', pageId: 'PG-4', reason: 'terminal', focused: false },
      ],
      focus: null,
      indexStatus: { kind: 'fresh', version: 1 },
      degradedDirectRead: false,
    },
  };
}

function renderRoute(initialEntry: string): HTMLElement {
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
  return render(<RouterProvider router={router} />).container;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('TimelineRoute a11y', () => {
  it('has no accessibility violations and keeps a valid heading hierarchy', async () => {
    getBranchTimelineMock.mockResolvedValue(buildTimeline());

    const container = renderRoute('/worlds/aurelia/stories/the-gathering/timeline?branch=BR-1');

    await screen.findByRole('heading', { level: 1, name: 'Branch timeline · BR-1' });
    await expectNoAxeViolations(container);
    assertHeadingHierarchy(container);
  });

  it('has no accessibility violations with the x-ray drawer open from a deep link', async () => {
    getBranchTimelineMock.mockResolvedValue(buildTimeline());
    getStateTickXrayMock.mockResolvedValue({
      envelope: null,
      payload: demoStateTickXray({ pageId: 'PG-1' }) as StateTickXray,
    });

    const container = renderRoute('/worlds/aurelia/stories/the-gathering/timeline?branch=BR-1&focus=PG-1');

    await screen.findByRole('dialog');
    await waitFor(() => expect(getStateTickXrayMock).toHaveBeenCalled());
    await expectNoAxeViolations(container);
  });
});
