import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, it, vi } from 'vitest';

import type { EnvelopedResult, SceneList } from '../api/client';
import * as client from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { ScenesRoute, sceneListLoader } from './scenes';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    listScenes: vi.fn(),
  };
});

const listScenesMock = vi.mocked(client.listScenes);

function buildSceneList(scenes: SceneList['scenes']): EnvelopedResult<SceneList> {
  return {
    envelope: null,
    payload: {
      scenes,
      indexStatus: { kind: 'fresh', version: 1 },
      degradedDirectRead: false,
    },
  };
}

function renderRoute(initialEntry: string): HTMLElement {
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
  return render(<RouterProvider router={router} />).container;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScenesRoute a11y', () => {
  it('has no accessibility violations and a valid heading hierarchy with scenes', async () => {
    listScenesMock.mockResolvedValue(
      buildSceneList([
        {
          sceneId: 'SCN-1',
          branchId: 'BR-1',
          pageIds: ['PG-1', 'PG-2'],
          startPageId: 'PG-1',
          endPageId: 'PG-2',
          publicationState: 'attached:WARN',
          coverageStatus: 'active',
          artifactAvailability: { hasPlan: true, hasProse: true, hasReceipt: true },
        },
      ]),
    );

    const container = renderRoute('/worlds/aurelia/stories/the-gathering/scenes');

    await screen.findByRole('heading', { level: 1, name: 'Scenes' });
    await expectNoAxeViolations(container);
    assertHeadingHierarchy(container);
  });

  it('has no accessibility violations in the empty state', async () => {
    listScenesMock.mockResolvedValue(buildSceneList([]));

    const container = renderRoute('/worlds/aurelia/stories/the-gathering/scenes');

    await screen.findByRole('heading', { level: 2, name: 'No scenes match these filters.' });
    await expectNoAxeViolations(container);
    assertHeadingHierarchy(container);
  });
});
