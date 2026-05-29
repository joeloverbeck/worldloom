import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api/client';
import { AppRouteError, routes } from './app';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('route tree', () => {
  // AC1/AC6: the page-reader surface is gone — the FULL nested paths must not
  // resolve to any route (a test against the bare `/entry` / `/pages/:pageId`
  // shorthand would pass trivially against the old app too).
  it('does not resolve the page-reader paths', () => {
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny/entry')).toBeNull();
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny/pages/PG-12')).toBeNull();
  });

  it('resolves the scene-first surface', () => {
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny')).not.toBeNull();
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny/timeline')).not.toBeNull();
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny/scenes')).not.toBeNull();
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny/scenes/SCN-3')).not.toBeNull();
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny/unscened')).not.toBeNull();
  });

  it('resolves the SPEC-98 search surface', () => {
    expect(matchRoutes(routes, '/worlds/fixture-world/stories/red-bunny/search')).not.toBeNull();
  });
});

describe('AppRouteError', () => {
  it('renders route-aware 404 recovery for loader ApiError misses', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/worlds/:slug/stories/:storySlug/pages/:pageId',
          loader: () => {
            throw new ApiError(404, { error: 'missing' });
          },
          errorElement: <AppRouteError />,
          element: <main>Loaded</main>,
        },
      ],
      { initialEntries: ['/worlds/fixture-world/stories/red-bunny/pages/PG-404'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Resource not found.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to story root' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny',
    );
  });

  it('revalidates the route when backend-unreachable retry is clicked', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(null);
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader,
          errorElement: <AppRouteError />,
          element: <main>Loaded after retry</main>,
        },
      ],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    await screen.findByText('Loaded after retry');
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });
});
