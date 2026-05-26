import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BackendUnreachablePage } from './BackendUnreachablePage';

describe('BackendUnreachablePage', () => {
  it('renders backend recovery guidance and retries without reloading the page', () => {
    const retry = vi.fn();

    render(<BackendUnreachablePage onRetry={retry} />);

    expect(screen.getByRole('heading', { name: 'Backend is unreachable.' })).toBeInTheDocument();
    expect(screen.getByText(/npm start --prefix tools\/story-explorer/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
