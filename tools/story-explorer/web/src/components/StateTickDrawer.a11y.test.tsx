import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StateTickXray } from '../api/client';
import { getStateTickXray } from '../api/client';
import { expectNoAxeViolations } from '../lib/a11y-test-helpers';
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

describe('StateTickDrawer a11y', () => {
  it('renders an accessible modal dialog without axe violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/timeline?focus=PG-12']}>
        <Routes>
          <Route
            path="/timeline"
            element={<StateTickDrawer worldSlug="fixture-world" storySlug="red-bunny" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'state-tick-drawer-title');
    await waitFor(() => expect(screen.getByRole('tablist', { name: 'State X-Ray tabs' })).toBeInTheDocument());

    await expectNoAxeViolations(container);
  });
});
