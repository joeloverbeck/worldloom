import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EnvelopedResult, SceneDetail, StateTickXray } from '../api/client';
import * as client from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { demoStateTickXray } from '../components/xray/__tests__/a11y-fixtures';
import { SceneDetailRoute, sceneDetailLoader } from './scene-detail';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getSceneDetail: vi.fn(),
    getSceneProse: vi.fn(),
    getScenePlan: vi.fn(),
    getSceneReceipt: vi.fn(),
    getStateTickXray: vi.fn(),
  };
});

const getSceneDetailMock = vi.mocked(client.getSceneDetail);
const getSceneProseMock = vi.mocked(client.getSceneProse);
const getSceneReceiptMock = vi.mocked(client.getSceneReceipt);
const getStateTickXrayMock = vi.mocked(client.getStateTickXray);

function buildSceneDetail(): EnvelopedResult<SceneDetail> {
  return {
    envelope: null,
    payload: {
      sceneId: 'SCN-3',
      branchId: 'BR-2',
      sceneRecord: null,
      pageIds: ['PG-1'],
      publicationState: 'attached:WARN',
      coverageStatus: 'active',
      includedPages: [
        {
          pageId: 'PG-1',
          branchId: 'BR-2',
          parentPageId: null,
          turnIndex: 1,
          resolvedEventId: 'SE-1',
          activeRecordCounts: { STENT: 2 },
          xrayHref: '/x/PG-1',
        },
      ],
      endChoiceSurface: { pageId: 'PG-1', emittedChoices: [] },
      eventDeltas: [],
      artifactAvailability: { hasPlan: true, hasProse: true, hasReceipt: true },
      artifactLinks: { plan: '/p', prose: '/r', receipt: '/c' },
      indexStatus: { kind: 'fresh', version: 1 },
      degradedDirectRead: false,
    },
  };
}

function renderRoute(): HTMLElement {
  const router = createMemoryRouter(
    [
      {
        path: '/worlds/:slug/stories/:storySlug/scenes/:sceneId',
        loader: sceneDetailLoader,
        element: <SceneDetailRoute />,
      },
    ],
    { initialEntries: ['/worlds/aurelia/stories/the-gathering/scenes/SCN-3'] },
  );
  return render(<RouterProvider router={router} />).container;
}

beforeEach(() => {
  getSceneDetailMock.mockResolvedValue(buildSceneDetail());
  getSceneProseMock.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'prose', sourcePath: 'scene-prose/SCN-3.md', body: 'Accessible scene prose.' },
  });
  getSceneReceiptMock.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'receipt', sourcePath: 'r.yaml', body: { verdict: 'WARN' } },
  });
  getStateTickXrayMock.mockImplementation((_slug, _story, pageId) =>
    Promise.resolve({ envelope: null, payload: demoStateTickXray({ pageId }) as StateTickXray }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SceneDetailRoute a11y', () => {
  it('has no axe violations and a valid heading hierarchy', async () => {
    const container = renderRoute();

    await screen.findByRole('heading', { level: 1, name: 'SCN-3' });
    await waitFor(() => expect(screen.getByText('Accessible scene prose.')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('tablist', { name: 'State X-Ray tabs' })).toBeInTheDocument());

    await expectNoAxeViolations(container);
    assertHeadingHierarchy(container);
  });
});
