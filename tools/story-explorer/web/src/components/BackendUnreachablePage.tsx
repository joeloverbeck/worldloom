interface BackendUnreachablePageProps {
  onRetry: () => void;
}

export function BackendUnreachablePage({ onRetry }: BackendUnreachablePageProps): JSX.Element {
  return (
    <main className="app-shell route-error" role="alert" aria-labelledby="backend-unreachable-title">
      <h1 id="backend-unreachable-title">Backend is unreachable.</h1>
      <p>
        Check that the explorer backend is running with <code>npm start --prefix tools/story-explorer</code>, then
        try again.
      </p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </main>
  );
}
