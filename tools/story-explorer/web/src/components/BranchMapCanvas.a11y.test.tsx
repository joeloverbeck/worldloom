import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BranchMapGraph } from '../api/client';
import { getBranchMap } from '../api/client';
import { expectNoAxeViolations } from '../lib/a11y-test-helpers';
import { BranchMapRoute } from '../routes/branch-map';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, getBranchMap: vi.fn() };
});

const mockedGetBranchMap = vi.mocked(getBranchMap);

const GRAPH: BranchMapGraph = {
  focus: { requested: 'BR-1', resolvedBranchId: 'BR-1', nodeId: 'SCN-1' },
  depth: 3,
  branchIds: ['BR-1'],
  nodes: [
    { kind: 'scene', id: 'SCN-1', branchId: 'BR-1', pageIds: ['PG-1'], startPg: 'PG-1', endPg: 'PG-1', publicationState: 'attached:PASS', focused: true },
    { kind: 'terminal_marker', id: 'term:BR-1:PG-1', branchId: 'BR-1', pageId: 'PG-1', reason: 'no_children', focused: false },
  ],
  edges: [],
  indexStatus: { kind: 'fresh', version: 9 },
  degradedDirectRead: false,
};

function renderRoute(): void {
  render(
    <MemoryRouter initialEntries={['/worlds/fixture-world/stories/red-bunny/branch-map?focus=BR-1']}>
      <Routes>
        <Route path="/worlds/:slug/stories/:storySlug/branch-map" element={<BranchMapRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedGetBranchMap.mockReset();
  mockedGetBranchMap.mockResolvedValue({ envelope: null, payload: GRAPH });
});

describe('BranchMapCanvas a11y', () => {
  it('opens an accessible modal drawer without axe violations', async () => {
    renderRoute();
    fireEvent.click(screen.getByRole('button', { name: 'Open branch map' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    await screen.findByRole('group', { name: 'Branch map scene segments' });
    await expectNoAxeViolations(dialog);
  });

  it('closes on Escape and returns focus to the invoking trigger', async () => {
    renderRoute();
    const trigger = screen.getByRole('button', { name: 'Open branch map' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab focus within the drawer', async () => {
    renderRoute();
    fireEvent.click(screen.getByRole('button', { name: 'Open branch map' }));
    const dialog = await screen.findByRole('dialog');

    const close = screen.getByRole('button', { name: 'Close' });
    close.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
