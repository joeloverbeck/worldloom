import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api/client';
import { AppRouteError } from './app';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
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

    expect(await screen.findByRole('heading', { name: 'Page not found.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to story root' })).toHaveAttribute(
      'href',
      '/worlds/fixture-world/stories/red-bunny/entry',
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
