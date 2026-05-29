import { Link } from 'react-router-dom';

export interface BreadcrumbCrumb {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  worldSlug: string;
  worldDisplayName: string;
  storySlug: string;
  storyTitle: string;
  /**
   * Trailing crumbs beyond the story dashboard (e.g. Timeline, Scene SCN-3).
   * The final crumb is rendered as the current location without a link; when
   * the trail is empty the story dashboard itself is the current location.
   */
  trail?: BreadcrumbCrumb[];
}

function storyDashboardHref(worldSlug: string, storySlug: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}`;
}

export function Breadcrumb({
  worldSlug,
  worldDisplayName,
  storySlug,
  storyTitle,
  trail = [],
}: BreadcrumbProps): JSX.Element {
  const storyIsCurrent = trail.length === 0;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/">Worlds</Link>
        </li>
        <li>
          <Link to={`/worlds/${encodeURIComponent(worldSlug)}/stories`}>{worldDisplayName}</Link>
        </li>
        <li {...(storyIsCurrent ? { 'aria-current': 'page' as const } : {})}>
          {storyIsCurrent ? (
            storyTitle
          ) : (
            <Link to={storyDashboardHref(worldSlug, storySlug)}>{storyTitle}</Link>
          )}
        </li>
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={crumb.href} {...(isLast ? { 'aria-current': 'page' as const } : {})}>
              {isLast ? crumb.label : <Link to={crumb.href}>{crumb.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
