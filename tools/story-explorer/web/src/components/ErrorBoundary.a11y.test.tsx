import { describe, expect, it } from 'vitest';

import { expectNoAxeViolations, renderForAxe } from '../lib/a11y-test-helpers';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild(): JSX.Element {
  throw new Error('broken child');
}

describe('ErrorBoundary a11y', () => {
  it('renders an accessible fallback after a subtree error', async () => {
    const { container, getByRole } = renderForAxe(
      <ErrorBoundary
        renderFallback={(error, retry) => (
          <main aria-labelledby="route-error-title">
            <div role="alert" aria-labelledby="route-error-title">
              <h1 id="route-error-title">Route failed.</h1>
              <p>{error.message}</p>
              <button type="button" onClick={retry}>
                Retry
              </button>
            </div>
          </main>
        )}
      >
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(getByRole('alert')).toHaveAccessibleName('Route failed.');
    expect(getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
