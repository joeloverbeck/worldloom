import { Suspense } from 'react';
import {
  createBrowserRouter,
  type RouteObject,
  RouterProvider,
  useParams,
  useRevalidator,
  useRouteError,
} from 'react-router-dom';

import { ApiError } from './api/client';
import { BackendUnreachablePage } from './components/BackendUnreachablePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFoundPage } from './components/NotFoundPage';
import { RouteLoading } from './components/RouteLoading';
import { SceneDetailRoute, sceneDetailLoader } from './routes/scene-detail';
import { ScenesRoute, sceneListLoader } from './routes/scenes';
import { SearchRoute } from './routes/search';
import { StoriesRoute, storyListLoader } from './routes/stories';
import { StoryDashboardRoute, storyDashboardLoader } from './routes/story-dashboard';
import { TimelineRoute, timelineLoader } from './routes/timeline';
import { UnscenedRoute, unscenedLoader } from './routes/unscened';
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
    return <NotFoundPage worldSlug={params.slug} storySlug={params.storySlug} />;
  }

  if (isNetworkError(error)) {
    return <BackendUnreachablePage onRetry={retry} />;
  }

  const routeError = error instanceof Error ? error : new Error('Story Explorer API request failed.');
  return <RouteFallback error={routeError} retry={retry} />;
}

export const routes: RouteObject[] = [
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
    path: '/worlds/:slug/stories/:storySlug/timeline',
    loader: timelineLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading timeline...">
        <TimelineRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/scenes',
    loader: sceneListLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading scenes...">
        <ScenesRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/scenes/:sceneId',
    loader: sceneDetailLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading scene detail...">
        <SceneDetailRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/unscened',
    loader: unscenedLoader,
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading unscened ranges...">
        <UnscenedRoute />
      </RouteFrame>
    ),
  },
  {
    path: '/worlds/:slug/stories/:storySlug/search',
    errorElement: <AppRouteError />,
    element: (
      <RouteFrame loadingLabel="Loading search...">
        <SearchRoute />
      </RouteFrame>
    ),
  },
];

const router = createBrowserRouter(routes);

export function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
