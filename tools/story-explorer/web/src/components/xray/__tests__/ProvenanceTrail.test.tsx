import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProvenanceTrail } from '../ProvenanceTrail';
import { recordCard } from './fixtures';

function envelope<T>(payload: T): { data: T } {
  return { data: payload };
}

function recordResponse(recordId: string, createdAtPage: string): unknown {
  return envelope({
    record: {
      id: recordId,
      created_at_page: createdAtPage,
    },
    recordCard: recordCard({ recordId, recordClass: 'SE' }),
  });
}

describe('ProvenanceTrail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads provenance and resolves SE page attribution in parallel', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => {
      const url = String(input);
      if (url.endsWith('/provenance/BEL-1')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              envelope({
                creatingSeId: 'SE-1',
                modifyingSeIds: ['SE-2', 'SE-3', 'SE-4'],
                evidenceRecords: ['SF-1', 'STQ-2'],
              }),
            ),
            { status: 200 },
          ),
        );
      }

      const eventPage: Record<string, string> = {
        'SE-1': 'PG-1',
        'SE-2': 'PG-2',
        'SE-3': 'PG-3',
        'SE-4': 'PG-4',
      };
      const eventId = Object.keys(eventPage).find((candidate) => url.endsWith(`/records/${candidate}`));
      if (eventId) {
        return Promise.resolve(new Response(JSON.stringify(recordResponse(eventId, eventPage[eventId]!)), { status: 200 }));
      }

      return Promise.resolve(new Response('{}', { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ProvenanceTrail recordId="BEL-1" storyContext={{ worldSlug: 'demo-world', storySlug: 'demo-story' }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading provenance for BEL-1.');
    await waitFor(() => expect(screen.getByText('SE-1 at PG-1')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'SE-2 at PG-2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SE-3 at PG-3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SE-4 at PG-4' })).toBeInTheDocument();
    expect(screen.getByText('SF-1')).toBeInTheDocument();
    expect(screen.getByText('STQ-2')).toBeInTheDocument();

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toEqual([
      '/api/worlds/demo-world/stories/demo-story/provenance/BEL-1',
      '/api/worlds/demo-world/stories/demo-story/records/SE-1',
      '/api/worlds/demo-world/stories/demo-story/records/SE-2',
      '/api/worlds/demo-world/stories/demo-story/records/SE-3',
      '/api/worlds/demo-world/stories/demo-story/records/SE-4',
    ]);
  });

  it('renders bootstrap provenance without fabricating a creating SE attribution', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              envelope({
                creatingSeId: null,
                modifyingSeIds: [],
                evidenceRecords: [],
              }),
            ),
            { status: 200 },
          ),
        ),
      ),
    );

    render(<ProvenanceTrail recordId="STCHAR-1" storyContext={{ worldSlug: 'demo-world', storySlug: 'demo-story' }} />);

    await waitFor(() => expect(screen.getByText('Bootstrap provenance')).toBeInTheDocument());
    expect(screen.getByText('No modifying events')).toBeInTheDocument();
    expect(screen.getByText('No evidence records.')).toBeInTheDocument();
  });

  it('keeps the trail visible when one modifying SE lookup fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/provenance/BEL-1')) {
          return Promise.resolve(
            new Response(
              JSON.stringify(
                envelope({
                  creatingSeId: 'SE-1',
                  modifyingSeIds: ['SE-2'],
                  evidenceRecords: ['SF-1'],
                }),
              ),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/records/SE-1')) {
          return Promise.resolve(new Response(JSON.stringify(recordResponse('SE-1', 'PG-1')), { status: 200 }));
        }

        return Promise.resolve(new Response(JSON.stringify({ error: 'missing' }), { status: 404 }));
      }),
    );

    render(<ProvenanceTrail recordId="BEL-1" storyContext={{ worldSlug: 'demo-world', storySlug: 'demo-story' }} />);

    await waitFor(() => expect(screen.getByText('SE-1 at PG-1')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'SE-2 at <unknown>' })).toBeInTheDocument();
    expect(screen.getByText('SF-1')).toBeInTheDocument();
  });

  it('routes event and evidence chips through the record-link callback', async () => {
    const onRecordLinkClick = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/provenance/BEL-1')) {
          return Promise.resolve(
            new Response(
              JSON.stringify(
                envelope({
                  creatingSeId: 'SE-1',
                  modifyingSeIds: ['SE-2'],
                  evidenceRecords: ['SF-1'],
                }),
              ),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/records/SE-1')) {
          return Promise.resolve(new Response(JSON.stringify(recordResponse('SE-1', 'PG-1')), { status: 200 }));
        }

        return Promise.resolve(new Response(JSON.stringify(recordResponse('SE-2', 'PG-2')), { status: 200 }));
      }),
    );

    render(
      <ProvenanceTrail
        onRecordLinkClick={onRecordLinkClick}
        recordId="BEL-1"
        storyContext={{ worldSlug: 'demo-world', storySlug: 'demo-story' }}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'SE-1 at PG-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'SE-2 at PG-2' }));
    fireEvent.click(screen.getByRole('button', { name: 'SF-1' }));

    expect(onRecordLinkClick).toHaveBeenNthCalledWith(1, 'SE-1');
    expect(onRecordLinkClick).toHaveBeenNthCalledWith(2, 'SE-2');
    expect(onRecordLinkClick).toHaveBeenNthCalledWith(3, 'SF-1');
  });

  it('does not load provenance until the expanded card body opens', async () => {
    const { RecordCardExpanded } = await import('../RecordCardExpanded');
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            envelope({
              creatingSeId: null,
              modifyingSeIds: [],
              evidenceRecords: [],
            }),
          ),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RecordCardExpanded
        recordCard={recordCard()}
        storyContext={{ worldSlug: 'demo-world', storySlug: 'demo-story' }}
      />,
    );

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByRole('button', { name: 'Expand record' }).click();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/worlds/demo-world/stories/demo-story/provenance/BEL-1', undefined);
  });
});
