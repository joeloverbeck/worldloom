import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteLoading } from './components/RouteLoading';
import { PageEntryRoute, pageEntryLoader } from './routes/page-entry';
import { PageReadRoute, pageReadLoader } from './routes/page-read';
import { StoriesRoute, storyListLoader } from './routes/stories';
import { WorldsRoute, worldListLoader } from './routes/worlds';

function RouteFallback({ error, retry }: { error: Error; retry: () => void }): JSX.Element {
  return (
    <main className="app-shell route-error" role="alert" aria-labelledby="route-error-title">
      <h1 id="route-error-title">Story Explorer could not load this route.</h1>
      <p>{error.message}</p>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </main>
  );
}

function RouteFrame({ children, loadingLabel }: { children: React.ReactNode; loadingLabel: string }): JSX.Element {
  return (
    <ErrorBoundary renderFallback={(error, retry) => <RouteFallback error={error} retry={retry} />}>
      <Suspense fallback={<RouteLoading label={loadingLabel} />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    loader: worldListLoader,
    element: (
      <RouteFrame loadingLabel="Loading worlds...">
        <WorldsRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories',
    loader: storyListLoader,
    element: (
      <RouteFrame loadingLabel="Loading stories...">
        <StoriesRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/entry',
    loader: pageEntryLoader,
    element: (
      <RouteFrame loadingLabel="Loading page entry...">
        <PageEntryRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/pages/:pageId',
    loader: pageReadLoader,
    element: (
      <RouteFrame loadingLabel="Loading page...">
        <PageReadRoute />
      </RouteFrame>
    ),
  },
]);

export function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
