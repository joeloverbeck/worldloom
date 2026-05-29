import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, useParams, useRevalidator, useRouteError } from 'react-router-dom';

import { ApiError } from './api/client';
import { BackendUnreachablePage } from './components/BackendUnreachablePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFoundPage } from './components/NotFoundPage';
import { RouteLoading } from './components/RouteLoading';
import { PageEntryRoute, pageEntryLoader } from './routes/page-entry';
import { PageReadRoute, pageReadLoader } from './routes/page-read';
import { StoriesRoute, storyListLoader } from './routes/stories';
import { StoryDashboardRoute, storyDashboardLoader } from './routes/story-dashboard';
import { WorldsRoute, worldListLoader } from './routes/worlds';

function RouteFallback({ error, retry }: { error: Error; retry: () => void }): JSX.Element {
  return (
    <main className="app-shell route-error" aria-labelledby="route-error-title">
      <div role="alert" aria-labelledby="route-error-title">
        <h1 id="route-error-title">Story Explorer could not load this route.</h1>
        <p>{error.message}</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
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

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message));
}

export function AppRouteError(): JSX.Element {
  const error = useRouteError();
  const params = useParams();
  const revalidator = useRevalidator();
  const retry = (): void => {
    revalidator.revalidate();
  };

  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundPage worldSlug={params.slug} storySlug={params.storySlug} resourceLabel="page" />;
  }

  if (isNetworkError(error)) {
    return <BackendUnreachablePage onRetry={retry} />;
  }

  const routeError = error instanceof Error ? error : new Error('Story Explorer API request failed.');
  return <RouteFallback error={routeError} retry={retry} />;
}

const router = createBrowserRouter([
  {
    path: '/',
    loader: worldListLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading worlds...">
        <WorldsRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories',
    loader: storyListLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading stories...">
        <StoriesRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug',
    loader: storyDashboardLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading story dashboard...">
        <StoryDashboardRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/entry',
    loader: pageEntryLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading page entry...">
        <PageEntryRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/pages/:pageId',
    loader: pageReadLoader,
    errorElement: <AppRouteError />,
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
