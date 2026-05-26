import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) {
    throw new Error('test boundary failure');
  }

  return <p>Recovered child</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders a route-provided fallback when a child throws', () => {
    render(
      <ErrorBoundary
        renderFallback={(error) => (
          <section role="alert">
            <h1>Readable fallback</h1>
            <p>{error.message}</p>
          </section>
        )}
      >
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('test boundary failure')).toBeInTheDocument();
  });

  it('resets the boundary when retry is used', () => {
    const { rerender } = render(
      <ErrorBoundary renderFallback={(_error, retry) => <button onClick={retry}>Try again</button>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary renderFallback={(_error, retry) => <button onClick={retry}>Try again</button>}>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered child')).toBeInTheDocument();
  });
});
