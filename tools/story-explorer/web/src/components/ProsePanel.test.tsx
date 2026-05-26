import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProseBody } from '../api/client';
import { ProsePanel } from './ProsePanel';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getProseBody: vi.fn(),
  };
});

const mockedGetProseBody = vi.mocked(getProseBody);

function renderPanel(overrides: Partial<React.ComponentProps<typeof ProsePanel>> = {}): void {
  render(
    <ProsePanel
      proseStatus="present"
      eagerProseBody="# Hello"
      pageId="PG-12"
      branchId="BR-3"
      turnIndex={7}
      worldSlug="fixture-world"
      storySlug="red-bunny"
      {...overrides}
    />,
  );
}

describe('ProsePanel', () => {
  beforeEach(() => {
    mockedGetProseBody.mockReset();
  });

  it('renders eager prose as sanitized markdown with a page status strip', () => {
    renderPanel({ eagerProseBody: '# Hello\n\nA quiet page.' });

    expect(screen.getByRole('heading', { level: 1, name: 'Hello' })).toBeInTheDocument();
    expect(screen.getByText('A quiet page.')).toBeInTheDocument();
    expect(screen.getByText('PG-12 · Branch BR-3 · Turn 7')).toBeInTheDocument();
    expect(mockedGetProseBody).not.toHaveBeenCalled();
  });

  it('fetches deferred present prose and renders the suspense fallback while loading', async () => {
    let resolveBody: (value: Awaited<ReturnType<typeof getProseBody>>) => void = () => undefined;
    mockedGetProseBody.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveBody = resolve;
      }),
    );

    renderPanel({ eagerProseBody: null, pageId: 'PG-lazy' });

    expect(screen.getByRole('status', { name: 'Loading prose...' })).toBeInTheDocument();
    expect(mockedGetProseBody).toHaveBeenCalledWith('fixture-world', 'red-bunny', 'PG-lazy');

    resolveBody({ envelope: null, payload: { status: 'present', body: 'Deferred **body**.' } });

    await waitFor(() => expect(screen.getByText(/Deferred/)).toBeInTheDocument());
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('PG-lazy · Branch BR-3 · Turn 7')).toBeInTheDocument();
  });

  it('renders placeholder states without fetching prose', () => {
    renderPanel({ proseStatus: 'missing', eagerProseBody: null });

    expect(screen.getByText('Rendered prose not attached yet.')).toBeInTheDocument();
    expect(screen.queryByText('PG-12 · Branch BR-3 · Turn 7')).not.toBeInTheDocument();
    expect(mockedGetProseBody).not.toHaveBeenCalled();
  });

  it('never substitutes the page plan for missing prose', () => {
    renderPanel({
      proseStatus: 'missing',
      eagerProseBody: null,
      pagePlanSummary: { path: 'pages-prose-plans/PG-12.md', body: 'Plan body must stay out of prose.' },
    });

    expect(screen.getByText('Rendered prose not attached yet.')).toBeInTheDocument();
    expect(screen.queryByText('Plan body must stay out of prose.')).not.toBeInTheDocument();
  });

  it('strips unsafe html before injecting markdown into the prose surface', async () => {
    renderPanel({ eagerProseBody: 'Safe <script>alert(1)</script> <img src=x onerror="alert(1)">' });

    await waitFor(() => expect(screen.getByText('Safe')).toBeInTheDocument());
    expect(document.querySelector('script')).toBeNull();
    expect(document.body.innerHTML).not.toContain('onerror');
    expect(document.body.innerHTML).not.toContain('alert(1)');
  });
});
