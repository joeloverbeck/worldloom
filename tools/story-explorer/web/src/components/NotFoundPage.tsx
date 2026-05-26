import { Link } from 'react-router-dom';

interface NotFoundPageProps {
  worldSlug?: string;
  storySlug?: string;
  resourceLabel?: string;
}

function storyRootPath(worldSlug: string, storySlug: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/entry`;
}

export function NotFoundPage({ worldSlug, storySlug, resourceLabel = 'page' }: NotFoundPageProps): JSX.Element {
  const hasStoryTarget = Boolean(worldSlug && storySlug);
  const title = `${resourceLabel[0]?.toUpperCase() ?? 'P'}${resourceLabel.slice(1)} not found.`;
  const target = hasStoryTarget ? storyRootPath(worldSlug as string, storySlug as string) : '/';
  const label = hasStoryTarget ? 'Back to story root' : 'Back to worlds';

  return (
    <main className="app-shell route-error" aria-labelledby="not-found-title">
      <div role="alert" aria-labelledby="not-found-title">
        <h1 id="not-found-title">{title}</h1>
        <p>The requested Story Explorer resource is not available from this backend.</p>
        <Link className="route-error__link" to={target}>
          {label}
        </Link>
      </div>
    </main>
  );
}
