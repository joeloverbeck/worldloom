import { Link } from 'react-router-dom';

interface BreadcrumbProps {
  worldSlug: string;
  worldDisplayName: string;
  storySlug: string;
  storyTitle: string;
  branchId: string;
  pageId: string;
  parentPageId: string | null;
}

function pageHref(worldSlug: string, storySlug: string, pageId: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/pages/${encodeURIComponent(
    pageId,
  )}`;
}

export function Breadcrumb({
  worldSlug,
  worldDisplayName,
  storySlug,
  storyTitle,
  branchId,
  pageId,
  parentPageId,
}: BreadcrumbProps): JSX.Element {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/">Worlds</Link>
        </li>
        <li>
          <Link to={`/worlds/${encodeURIComponent(worldSlug)}/stories`}>{worldDisplayName}</Link>
        </li>
        <li>
          <Link to={`/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/entry`}>
            {storyTitle}
          </Link>
        </li>
        <li>Branch {branchId}</li>
        <li aria-current="page">{pageId}</li>
      </ol>
      {parentPageId === null ? null : (
        <Link className="breadcrumb__parent" to={pageHref(worldSlug, storySlug, parentPageId)}>
          Parent: {parentPageId}
        </Link>
      )}
    </nav>
  );
}
