import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BranchMapGraph } from '../api/client';
import { getBranchMap } from '../api/client';
import { BranchMapCanvas } from './BranchMapCanvas';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, getBranchMap: vi.fn() };
});

const mockedGetBranchMap = vi.mocked(getBranchMap);

const GRAPH: BranchMapGraph = {
  focus: { requested: 'BR-1', resolvedBranchId: 'BR-1', nodeId: 'SCN-1' },
  depth: 3,
  branchIds: ['BR-1', 'BR-2'],
  nodes: [
    { kind: 'scene', id: 'SCN-1', branchId: 'BR-1', pageIds: ['PG-1'], startPg: 'PG-1', endPg: 'PG-1', publicationState: 'attached:PASS', focused: true },
    { kind: 'branch_split', id: 'split:BR-1:PG-1', branchId: 'BR-1', pageId: 'PG-1', childBranchIds: ['BR-1', 'BR-2'], focused: false },
    { kind: 'scene', id: 'SCN-2', branchId: 'BR-1', pageIds: ['PG-2'], startPg: 'PG-2', endPg: 'PG-2', publicationState: 'planned', focused: false },
    { kind: 'terminal_marker', id: 'term:BR-1:PG-2', branchId: 'BR-1', pageId: 'PG-2', reason: 'paused', focused: false },
    { kind: 'unscened_run', id: 'ur:BR-2:PG-3:PG-3', branchId: 'BR-2', pageIds: ['PG-3'], startPg: 'PG-3', endPg: 'PG-3', tickCount: 1, finalChoiceCount: 1, label: 'PG-3..PG-3 · 1 ticks · no SCN · final choices: 1', focused: false },
    { kind: 'choice_surface', id: 'chs:BR-2:PG-3', branchId: 'BR-2', pageId: 'PG-3', choiceCount: 1, focused: false },
  ],
  edges: [{ from: 'split:BR-1:PG-1', to: 'ur:BR-2:PG-3:PG-3', branchId: 'BR-2', kind: 'fork' }],
  indexStatus: { kind: 'fresh', version: 9 },
  degradedDirectRead: false,
};

function renderCanvas(): void {
  render(<BranchMapCanvas worldSlug="fixture-world" storySlug="red-bunny" focus="BR-1" isOpen onClose={vi.fn()} />);
}

beforeEach(() => {
  mockedGetBranchMap.mockReset();
  mockedGetBranchMap.mockResolvedValue({ envelope: null, payload: GRAPH });
});

describe('BranchMapCanvas', () => {
  it('renders the single-layer scene-segment node set inside the drawer', async () => {
    renderCanvas();
    const dialog = await screen.findByRole('dialog');
    const canvas = await within(dialog).findByRole('group', { name: 'Branch map scene segments' });

    for (const kind of ['scene', 'unscened_run', 'branch_split', 'choice_surface', 'terminal_marker']) {
      expect(canvas.querySelector(`[data-node-kind="${kind}"]`)).not.toBeNull();
    }
    // Compressed unscened-run bar is rendered verbatim.
    expect(within(canvas).getByText('PG-3..PG-3 · 1 ticks · no SCN · final choices: 1')).toBeInTheDocument();
    // Both branches are columns; the canvas is drawer-scoped (inside the dialog).
    expect(within(canvas).getByRole('region', { name: 'Branch BR-1' })).toBeInTheDocument();
    expect(within(canvas).getByRole('region', { name: 'Branch BR-2' })).toBeInTheDocument();
  });

  it('fetches the focused branch map and marks the focused node', async () => {
    renderCanvas();
    await screen.findByRole('dialog');
    expect(mockedGetBranchMap).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'BR-1');
    await waitFor(() => expect(document.querySelector('[data-node-id="SCN-1"][aria-current="true"]')).not.toBeNull());
  });

  it('does not fabricate a graph when the backend reports a degraded index', async () => {
    mockedGetBranchMap.mockResolvedValue({
      envelope: null,
      payload: { ...GRAPH, nodes: [], edges: [], branchIds: [], degradedDirectRead: true, indexStatus: { kind: 'missing', remedy: 'rebuild' } },
    });
    renderCanvas();

    await waitFor(() => expect(screen.getByText(/not fresh/)).toBeInTheDocument());
    expect(screen.queryByRole('group', { name: 'Branch map scene segments' })).not.toBeInTheDocument();
  });
});
