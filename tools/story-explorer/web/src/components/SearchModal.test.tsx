import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchGroup, SearchHit, SearchResults } from '../api/client';
import { search } from '../api/client';
import { SearchModal } from './SearchModal';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, search: vi.fn() };
});

const mockedSearch = vi.mocked(search);

const SCENE_CONTAINER = {
  kind: 'scene' as const,
  sceneId: 'SCN-1',
  branchId: 'BR-1',
  startPg: 'PG-1',
  endPg: 'PG-2',
  pageIds: ['PG-1', 'PG-2'],
  label: 'SCN-1 (PG-1..PG-2)',
};
const UNSCENED_CONTAINER = {
  kind: 'unscened_range' as const,
  branchId: 'BR-1',
  startPg: 'PG-3',
  endPg: 'PG-3',
  pageIds: ['PG-3'],
  label: 'unscened range PG-3..PG-3',
};

const SCENE_HITS: SearchHit[] = [
  {
    kind: 'state_tick',
    domain: 'state',
    recordId: 'PG-2',
    title: 'PG-2',
    excerpt: '…a red bunny…',
    container: SCENE_CONTAINER,
    expandable: { recordId: 'PG-2', sceneId: null, artifactKind: null, href: '/api/worlds/w/stories/s/records/PG-2/raw' },
  },
  {
    kind: 'raw_source',
    domain: 'state',
    recordId: 'BEL-1',
    title: 'BEL-1',
    excerpt: '…the bunny belief…',
    container: SCENE_CONTAINER,
    expandable: { recordId: 'BEL-1', sceneId: null, artifactKind: null, href: '/api/worlds/w/stories/s/records/BEL-1/raw' },
  },
];
const UNSCENED_HITS: SearchHit[] = [
  {
    kind: 'unscened_range',
    domain: 'state',
    recordId: 'PG-3',
    title: 'PG-3',
    excerpt: '…bunny clue…',
    container: UNSCENED_CONTAINER,
    expandable: { recordId: 'PG-3', sceneId: null, artifactKind: null, href: '/api/worlds/w/stories/s/records/PG-3/raw' },
  },
];

const GROUPS: SearchGroup[] = [
  { container: SCENE_CONTAINER, hits: SCENE_HITS },
  { container: UNSCENED_CONTAINER, hits: UNSCENED_HITS },
];

const RESULTS: SearchResults = {
  query: { q: 'bunny', kinds: [], domains: [], groupBy: 'scene_or_unscened_range', limit: 50, offset: 0 },
  total: 3,
  indexStatus: { kind: 'fresh', version: 9 },
  degradedDirectRead: false,
  groups: GROUPS,
  hits: [...SCENE_HITS, ...UNSCENED_HITS],
};

function renderModal(onClose = vi.fn()): { onClose: ReturnType<typeof vi.fn> } {
  render(
    <MemoryRouter>
      <SearchModal worldSlug="fixture-world" storySlug="red-bunny" isOpen onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose };
}

async function submitQuery(): Promise<void> {
  fireEvent.change(screen.getByLabelText('Query'), { target: { value: 'bunny' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await screen.findByRole('region', { name: 'SCN-1 (PG-1..PG-2)' });
}

beforeEach(() => {
  mockedSearch.mockReset();
  mockedSearch.mockResolvedValue({ envelope: null, payload: RESULTS });
});

describe('SearchModal', () => {
  it('issues a search and renders results grouped by container', async () => {
    renderModal();
    await submitQuery();

    expect(mockedSearch).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'bunny');
    expect(screen.getByRole('region', { name: 'SCN-1 (PG-1..PG-2)' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'unscened range PG-3..PG-3' })).toBeInTheDocument();
    expect(screen.getByText('3 results for “bunny”.')).toBeInTheDocument();
  });

  it('wires jump-to-segment links to scene and timeline focus', async () => {
    renderModal();
    await submitQuery();

    const links = screen.getAllByRole('link').filter((link) => link.hasAttribute('data-search-result'));
    expect(links[0]).toHaveAttribute('href', '/worlds/fixture-world/stories/red-bunny/scenes/SCN-1');
    const unscenedLink = links.find((link) => link.getAttribute('href')?.includes('/timeline'));
    expect(unscenedLink).toHaveAttribute('href', '/worlds/fixture-world/stories/red-bunny/timeline?branch=BR-1&focus=PG-3');
  });

  it('closes (dispatches) when a jump link is activated', async () => {
    const { onClose } = renderModal();
    await submitQuery();

    const link = screen.getAllByRole('link').filter((entry) => entry.hasAttribute('data-search-result'))[0]!;
    fireEvent.click(link);
    expect(onClose).toHaveBeenCalled();
  });

  it('moves focus between results with arrow keys', async () => {
    renderModal();
    await submitQuery();

    const links = screen.getAllByRole('link').filter((link) => link.hasAttribute('data-search-result'));
    links[0]?.focus();
    expect(links[0]).toHaveFocus();
    fireEvent.keyDown(links[0]!, { key: 'ArrowDown' });
    expect(links[1]).toHaveFocus();
    fireEvent.keyDown(links[1]!, { key: 'ArrowUp' });
    expect(links[0]).toHaveFocus();
  });

  it('does not fabricate results when the backend reports a degraded index', async () => {
    mockedSearch.mockResolvedValue({
      envelope: null,
      payload: { ...RESULTS, groups: [], hits: [], total: 0, degradedDirectRead: true, indexStatus: { kind: 'missing', remedy: 'rebuild' } },
    });
    renderModal();
    fireEvent.change(screen.getByLabelText('Query'), { target: { value: 'bunny' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(screen.getByText(/not fresh/)).toBeInTheDocument());
    expect(screen.queryByRole('region', { name: 'SCN-1 (PG-1..PG-2)' })).not.toBeInTheDocument();
  });
});
