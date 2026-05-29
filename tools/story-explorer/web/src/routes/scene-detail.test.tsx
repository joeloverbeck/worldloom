import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EnvelopedResult, SceneDetail, StateTickXray } from '../api/client';
import * as client from '../api/client';
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
const getStateTickXrayMock = vi.mocked(client.getStateTickXray);

function buildSceneDetail(overrides: Partial<SceneDetail> = {}): EnvelopedResult<SceneDetail> {
  return {
    envelope: null,
    payload: {
      sceneId: 'SCN-3',
      branchId: 'BR-2',
      sceneRecord: null,
      pageIds: ['PG-1', 'PG-2'],
      publicationState: 'attached:PASS',
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
      endChoiceSurface: { pageId: 'PG-2', emittedChoices: [] },
      eventDeltas: [],
      artifactAvailability: { hasPlan: true, hasProse: true, hasReceipt: false },
      artifactLinks: { plan: '/p', prose: '/r', receipt: '/c' },
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
        path: '/worlds/:slug/stories/:storySlug/scenes/:sceneId',
        loader: sceneDetailLoader,
        element: <SceneDetailRoute />,
      },
    ],
    { initialEntries: [initialEntry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  getSceneProseMock.mockResolvedValue({
    envelope: null,
    payload: { sceneId: 'SCN-3', kind: 'prose', sourcePath: 'scene-prose/SCN-3.md', body: 'Loaded scene prose.' },
  });
  getStateTickXrayMock.mockImplementation((_slug, _story, pageId) =>
    Promise.resolve({ envelope: null, payload: demoStateTickXray({ pageId }) as StateTickXray }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('sceneDetailLoader', () => {
  it('loads the scene detail for the route params', async () => {
    getSceneDetailMock.mockResolvedValue(buildSceneDetail());

    const result = await sceneDetailLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering', sceneId: 'SCN-3' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/scenes/SCN-3'),
      context: {},
    });

    expect(getSceneDetailMock).toHaveBeenCalledWith('aurelia', 'the-gathering', 'SCN-3');
    expect(result.worldSlug).toBe('aurelia');
    expect(result.storySlug).toBe('the-gathering');
  });

  it('throws when a required param is missing', async () => {
    await expect(
      sceneDetailLoader({
        params: { slug: 'aurelia', storySlug: 'the-gathering' },
        request: new Request('http://localhost/x'),
        context: {},
      }),
    ).rejects.toThrow(/scene id/);
  });
});

describe('SceneDetailRoute', () => {
  it('renders the workbench shell for the loaded scene', async () => {
    getSceneDetailMock.mockResolvedValue(buildSceneDetail());

    renderRoute('/worlds/aurelia/stories/the-gathering/scenes/SCN-3');

    expect(await screen.findByRole('heading', { level: 1, name: 'SCN-3' })).toBeInTheDocument();
    expect(await screen.findByText('Loaded scene prose.')).toBeInTheDocument();
  });

  it('drives the embedded x-ray from ?focusPg', async () => {
    getSceneDetailMock.mockResolvedValue(buildSceneDetail());

    renderRoute('/worlds/aurelia/stories/the-gathering/scenes/SCN-3?focusPg=PG-2');

    await screen.findByRole('heading', { level: 1, name: 'SCN-3' });
    await waitFor(() => expect(getStateTickXrayMock).toHaveBeenCalledWith('aurelia', 'the-gathering', 'PG-2'));
  });
});
