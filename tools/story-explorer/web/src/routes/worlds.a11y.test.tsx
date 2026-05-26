import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexStatus, WorldSummary } from '../api/client';
import { listWorlds } from '../api/client';
import { assertHeadingHierarchy, expectNoAxeViolations, withReducedMotion } from '../lib/a11y-test-helpers';
import { WorldsRoute, worldListLoader } from './worlds';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, listWorlds: vi.fn() };
});

const mockedListWorlds = vi.mocked(listWorlds);

function indexStatus(): IndexStatus {
  return { kind: 'fresh', version: 1 };
}

function world(overrides: Partial<WorldSummary> = {}): WorldSummary {
  return {
    worldSlug: 'fixture-world',
    displayName: 'Fixture World',
    path: 'worlds/fixture-world',
    indexStatus: indexStatus(),
    storyCount: 1,
    hasWorldDb: true,
    indexVersion: 1,
    driftedFiles: [],
    errors: [],
    ...overrides,
  };
}

async function renderRoute(): Promise<HTMLElement> {
  mockedListWorlds.mockResolvedValue({ envelope: null, payload: [world()] });
  const router = createMemoryRouter([{ path: '/', loader: worldListLoader, element: <WorldsRoute /> }], {
    initialEntries: ['/'],
  });
  const { container } = render(<RouterProvider router={router} />);
  await waitFor(() => expect(mockedListWorlds).toHaveBeenCalledOnce());
  return container;
}

beforeEach(() => {
  mockedListWorlds.mockReset();
});

describe('WorldsRoute a11y', () => {
  it('has no axe violations in the composed world picker route', async () => {
    const container = await renderRoute();

    assertHeadingHierarchy(container);
    await expectNoAxeViolations(container);
  });

  it('keeps the route accessible with reduced motion requested', async () => {
    await withReducedMotion(async () => {
      const container = await renderRoute();

      await expectNoAxeViolations(container);
    });
  });
});
