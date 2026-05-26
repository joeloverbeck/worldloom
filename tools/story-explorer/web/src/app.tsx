import { createBrowserRouter, RouterProvider } from 'react-router-dom';

function RoutePlaceholder({ label }: { label: string }): JSX.Element {
  return (
    <main className="app-shell" aria-label={label}>
      <p>{label}</p>
    </main>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RoutePlaceholder label="Route: /" />,
  },
  {
    path: '/worlds/:slug/stories',
    element: <RoutePlaceholder label="Route: /worlds/:slug/stories" />,
  },
  {
    path: '/worlds/:slug/stories/:storySlug/entry',
    element: <RoutePlaceholder label="Route: /worlds/:slug/stories/:storySlug/entry" />,
  },
  {
    path: '/worlds/:slug/stories/:storySlug/pages/:pageId',
    element: <RoutePlaceholder label="Route: /worlds/:slug/stories/:storySlug/pages/:pageId" />,
  },
]);

export function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
