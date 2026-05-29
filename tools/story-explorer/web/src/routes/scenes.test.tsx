import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EnvelopedResult, SceneList, SceneSummary } from '../api/client';
import * as client from '../api/client';
import { ScenesRoute, sceneListLoader } from './scenes';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    listScenes: vi.fn(),
  };
});

const listScenesMock = vi.mocked(client.listScenes);

function fixtureScenes(): SceneSummary[] {
  return [
    {
      sceneId: 'SCN-1',
      branchId: 'BR-1',
      pageIds: ['PG-1', 'PG-2'],
      startPageId: 'PG-1',
      endPageId: 'PG-2',
      publicationState: 'attached:PASS',
      coverageStatus: 'active',
      artifactAvailability: { hasPlan: true, hasProse: true, hasReceipt: true },
    },
    {
      sceneId: 'SCN-2',
      branchId: 'BR-2',
      pageIds: ['PG-3'],
      startPageId: 'PG-3',
      endPageId: 'PG-3',
      publicationState: 'planned',
      coverageStatus: 'superseded',
      artifactAvailability: { hasPlan: true, hasProse: false, hasReceipt: false },
    },
  ];
}

function buildSceneList(overrides: Partial<SceneList> = {}): EnvelopedResult<SceneList> {
  return {
    envelope: null,
    payload: {
      scenes: fixtureScenes(),
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
        path: '/worlds/:slug/stories/:storySlug/scenes',
        loader: sceneListLoader,
        element: <ScenesRoute />,
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

describe('sceneListLoader', () => {
  it('calls /scenes with no filters when the URL has no query', async () => {
    listScenesMock.mockResolvedValue(buildSceneList());

    await sceneListLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/scenes'),
      context: {},
    });

    expect(listScenesMock).toHaveBeenCalledWith('aurelia', 'the-gathering', {});
  });

  it('maps each filter control to the SPEC-96 query param', async () => {
    listScenesMock.mockResolvedValue(buildSceneList());

    await sceneListLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request(
        'http://localhost/worlds/aurelia/stories/the-gathering/scenes?branch=BR-2&hasProse=true&receiptVerdict=WARN&coverage=superseded',
      ),
      context: {},
    });

    expect(listScenesMock).toHaveBeenCalledWith('aurelia', 'the-gathering', {
      branchId: 'BR-2',
      hasProse: true,
      receiptVerdict: 'WARN',
      coverage: 'superseded',
    });
  });

  it('maps hasProse=false to the negated SPEC-96 filter', async () => {
    listScenesMock.mockResolvedValue(buildSceneList());

    await sceneListLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/scenes?hasProse=false'),
      context: {},
    });

    expect(listScenesMock).toHaveBeenCalledWith('aurelia', 'the-gathering', { hasProse: false });
  });

  it('ignores unrecognized receiptVerdict / coverage values', async () => {
    listScenesMock.mockResolvedValue(buildSceneList());

    await sceneListLoader({
      params: { slug: 'aurelia', storySlug: 'the-gathering' },
      request: new Request('http://localhost/worlds/aurelia/stories/the-gathering/scenes?receiptVerdict=BOGUS&coverage=nope'),
      context: {},
    });

    expect(listScenesMock).toHaveBeenCalledWith('aurelia', 'the-gathering', {});
  });
});

describe('ScenesRoute', () => {
  it('renders each SceneSummary with its publication chip and a detail link', async () => {
    listScenesMock.mockResolvedValue(buildSceneList());

    renderRoute('/worlds/aurelia/stories/the-gathering/scenes');

    expect(await screen.findByRole('heading', { level: 1, name: 'Scenes' })).toBeInTheDocument();

    const sceneOne = screen.getByRole('link', { name: /SCN-1/ });
    expect(sceneOne).toHaveAttribute('href', '/worlds/aurelia/stories/the-gathering/scenes/SCN-1');
    const sceneTwo = screen.getByRole('link', { name: /SCN-2/ });
    expect(sceneTwo).toHaveAttribute('href', '/worlds/aurelia/stories/the-gathering/scenes/SCN-2');

    const chips = screen.getAllByTestId('publication-chip');
    expect(chips.map((chip) => chip.textContent)).toEqual(['attached:PASS', 'planned']);
  });

  it('renders an empty state when no scenes match', async () => {
    listScenesMock.mockResolvedValue(buildSceneList({ scenes: [] }));

    renderRoute('/worlds/aurelia/stories/the-gathering/scenes');

    expect(await screen.findByRole('heading', { level: 2, name: 'No scenes match these filters.' })).toBeInTheDocument();
  });

  it('writes a selected filter to the URL query, re-querying the backend', async () => {
    listScenesMock.mockResolvedValue(buildSceneList());

    const router = renderRoute('/worlds/aurelia/stories/the-gathering/scenes');

    await screen.findByRole('heading', { level: 1, name: 'Scenes' });

    fireEvent.change(screen.getByLabelText('Coverage'), { target: { value: 'superseded' } });

    await waitFor(() => expect(router.state.location.search).toContain('coverage=superseded'));
    await waitFor(() =>
      expect(listScenesMock).toHaveBeenLastCalledWith('aurelia', 'the-gathering', { coverage: 'superseded' }),
    );
  });
});
