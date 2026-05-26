import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ResponseEnvelope } from '../api/client';
import { useIndexStatusBanner } from './use-index-status-banner';

function envelope(worldIndexStatus: ResponseEnvelope['worldIndexStatus']): ResponseEnvelope {
  return {
    requestId: 'req-1',
    serverVersion: 'test',
    worldIndexStatus,
  };
}

function HookProbe({ value }: { value: ResponseEnvelope | null }): JSX.Element {
  return <>{useIndexStatusBanner(value)}</>;
}

describe('useIndexStatusBanner', () => {
  it('returns no banner for null or fresh envelopes', () => {
    const { container, rerender } = render(<HookProbe value={null} />);

    expect(container).toBeEmptyDOMElement();

    rerender(<HookProbe value={envelope({ kind: 'fresh', version: 1 })} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('returns a banner for non-fresh envelopes', () => {
    render(<HookProbe value={envelope({ kind: 'open_failed', error: 'EACCES: permission denied' })} />);

    expect(screen.getByRole('status')).toHaveTextContent('Index could not be opened. EACCES: permission denied');
  });
});
