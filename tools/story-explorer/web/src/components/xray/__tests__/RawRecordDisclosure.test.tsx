import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RawRecordDisclosure } from '../RawRecordDisclosure';

describe('RawRecordDisclosure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches raw source on first open, caches it, and renders read-only source metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          body: 'id: BEL-1\nclaim: The gate is watched\n',
          sourcePath: 'worlds/demo/stories/test/_source/beliefs/BEL-1.yaml',
          contentHash: 'sha256-demo',
        },
      }),
    } as Response);

    render(<RawRecordDisclosure recordId="BEL-1" storySlug="demo-story" worldSlug="demo-world" />);

    const trigger = screen.getByRole('button', { name: 'View raw record' });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('worlds/demo/stories/test/_source/beliefs/BEL-1.yaml')).toBeInTheDocument();
    });
    expect(screen.getByText('sha256-demo')).toBeInTheDocument();
    expect(screen.getByText(/claim: The gate is watched/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(document.querySelector('[contenteditable="true"]')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/worlds/demo-world/stories/demo-story/records/BEL-1/raw');
    expect(fetchMock.mock.calls.map((call) => call[1]?.method).filter(Boolean)).not.toContain('PUT');
    expect(fetchMock.mock.calls.map((call) => call[1]?.method).filter(Boolean)).not.toContain('PATCH');
    expect(fetchMock.mock.calls.map((call) => call[1]?.method).filter(Boolean)).not.toContain('DELETE');
  });
});
