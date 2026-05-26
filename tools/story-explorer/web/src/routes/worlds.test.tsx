import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, WorldSummary } from '../api/client';
import { listWorlds } from '../api/client';
import { WorldsRoute, worldListLoader, worldStatusBadge } from './worlds';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    listWorlds: vi.fn(),
  };
});

const mockedListWorlds = vi.mocked(listWorlds);

function indexStatus(kind: IndexStatus['kind']): IndexStatus {
  switch (kind) {
    case 'fresh':
      return { kind, version: 1 };
    case 'missing':
      return { kind, remedy: 'Run world-index build fixture-world.' };
    case 'version_mismatch':
      return { kind, expected: 2, found: 1, remedy: 'Rebuild the index.' };
    case 'empty':
      return { kind, remedy: 'Add story records.' };
    case 'stale':
      return { kind, driftedFiles: ['WORLD_KERNEL.md'], remedy: 'Run world-index sync fixture-world.' };
    case 'open_failed':
      return { kind, error: 'database is locked' };
  }
}

function world(overrides: Partial<WorldSummary>): WorldSummary {
  return {
    worldSlug: 'fixture-world',
    displayName: 'Fixture World',
    path: 'worlds/fixture-world',
    indexStatus: indexStatus('fresh'),
    storyCount: 2,
    hasWorldDb: true,
    indexVersion: 1,
    driftedFiles: [],
    errors: [],
    ...overrides,
  };
}

async function renderWorldsRoute(worlds: WorldSummary[]): Promise<void> {
  mockedListWorlds.mockResolvedValue({
    envelope: null,
    payload: worlds,
  });

  const router = createMemoryRouter(
    [
      {
        path: '/',
        loader: worldListLoader,
        element: <WorldsRoute />,
      },
      {
        path: '/worlds/:slug/stories',
        element: <main>Story picker route</main>,
      },
    ],
    { initialEntries: ['/'] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => expect(mockedListWorlds).toHaveBeenCalledOnce());
}

beforeEach(() => {
  mockedListWorlds.mockReset();
});

describe('WorldsRoute', () => {
  it('renders one card per world with identity and story count', async () => {
    await renderWorldsRoute([
      world({ worldSlug: 'alpha', displayName: 'Alpha', storyCount: 1 }),
      world({ worldSlug: 'beta', displayName: 'Beta', storyCount: 3 }),
      world({ worldSlug: 'gamma', displayName: 'Gamma', storyCount: 0 }),
    ]);

    expect(await screen.findByRole('heading', { name: 'Worlds' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveTextContent('alpha');
    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveTextContent('1 story');
    expect(screen.getByRole('link', { name: /Beta/ })).toHaveTextContent('3 stories');
    expect(screen.getByRole('link', { name: /Gamma/ })).toHaveTextContent('0 stories');
  });

  it('renders the empty repository state', async () => {
    await renderWorldsRoute([]);

    expect(await screen.findByText('No worlds found in this repository.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Repository map' })).toHaveAttribute('href', '/docs/REPOSITORY-MAP.md');
  });

  it('maps every index status and world error to the picker badge labels', () => {
    expect(worldStatusBadge(indexStatus('fresh'), [])).toMatchObject({ label: 'Indexed' });
    expect(worldStatusBadge(indexStatus('missing'), [])).toMatchObject({ label: 'Missing index' });
    expect(worldStatusBadge(indexStatus('stale'), [])).toMatchObject({ label: 'Stale index' });
    expect(worldStatusBadge(indexStatus('empty'), [])).toMatchObject({ label: 'Empty world' });
    expect(worldStatusBadge(indexStatus('version_mismatch'), [])).toMatchObject({ label: 'Error' });
    expect(worldStatusBadge(indexStatus('open_failed'), [])).toMatchObject({ label: 'Error' });
    expect(worldStatusBadge(indexStatus('fresh'), ['Malformed world directory.'])).toMatchObject({ label: 'Error' });
  });

  it('uses links to navigate to the selected world story picker', async () => {
    await renderWorldsRoute([world({ worldSlug: 'fixture world', displayName: 'Fixture World' })]);

    fireEvent.click(await screen.findByRole('link', { name: /Fixture World/ }));

    expect(await screen.findByText('Story picker route')).toBeInTheDocument();
  });
});
