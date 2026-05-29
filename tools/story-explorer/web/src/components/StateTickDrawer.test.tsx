import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StateTickXray } from '../api/client';
import { getStateTickXray } from '../api/client';
import { StateTickDrawer } from './StateTickDrawer';
import { demoStateTickXray } from './xray/__tests__/a11y-fixtures';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getStateTickXray: vi.fn(),
  };
});

const mockedGetStateTickXray = vi.mocked(getStateTickXray);

beforeEach(() => {
  mockedGetStateTickXray.mockReset();
  mockedGetStateTickXray.mockResolvedValue({
    envelope: null,
    payload: demoStateTickXray({ pageId: 'PG-12' }) as StateTickXray,
  });
});

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
}

function renderDrawer(initialEntry: string, pageId?: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/timeline"
          element={
            <>
              <StateTickDrawer worldSlug="fixture-world" storySlug="red-bunny" pageId={pageId ?? null} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StateTickDrawer', () => {
  it('stays closed and does not fetch when no ?focus is present', () => {
    renderDrawer('/timeline');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedGetStateTickXray).not.toHaveBeenCalled();
  });

  it('opens on a preset ?focus, fetches the tick, and renders the X-Ray panel for the page', async () => {
    renderDrawer('/timeline?focus=PG-12');

    await waitFor(() => expect(mockedGetStateTickXray).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'PG-12'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'State X-Ray · PG-12' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('tablist', { name: 'State X-Ray tabs' })).toBeInTheDocument());
  });

  it('opens by setting ?focus when given a pageId prop', async () => {
    renderDrawer('/timeline', 'PG-12');

    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent('focus=PG-12'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('clears ?focus when closed via the close button', async () => {
    renderDrawer('/timeline?focus=PG-12');

    const closeButton = await screen.findByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('focus');
  });

  it('closes on Escape and clears ?focus', async () => {
    renderDrawer('/timeline?focus=PG-12');

    await screen.findByRole('dialog');
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('focus');
  });
});
