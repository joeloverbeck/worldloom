import { Link } from 'react-router-dom';

import type { PageDetail } from '../api/client';
import { formatTurnIndex } from '../lib/format';
import { BranchChip } from './BranchChip';
import { IntegrityChip } from './IntegrityChip';

interface PageHeaderProps {
  pageDetail: PageDetail;
  storyTitle: string;
  worldSlug: string;
  storySlug: string;
  pageId: string;
}

function pageHref(worldSlug: string, storySlug: string, pageId: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/pages/${encodeURIComponent(
    pageId,
  )}`;
}

export function PageHeader({ pageDetail, storyTitle, worldSlug, storySlug, pageId }: PageHeaderProps): JSX.Element {
  const { branchId, parentPageId, turnIndex } = pageDetail.branchContext;

  return (
    <header className="page-header" aria-labelledby="page-title">
      <div className="page-header__identity">
        <p className="route-kicker">{storySlug}</p>
        <h1 id="page-title">{storyTitle}</h1>
      </div>
      <div className="page-header__meta" aria-label="Current page">
        <span className="page-header__page-id">{pageId}</span>
        <BranchChip branchId={branchId} />
        <span>{formatTurnIndex(turnIndex)}</span>
      </div>
      <div className="page-header__actions" aria-label="Page tools">
        {parentPageId === null ? null : (
          <Link className="page-header__parent" to={pageHref(worldSlug, storySlug, parentPageId)}>
            Parent {parentPageId}
          </Link>
        )}
        <button type="button" className="page-header__tool">
          Branch map
        </button>
        <button type="button" className="page-header__tool">
          Page jump
        </button>
        <IntegrityChip validationIntegrity={pageDetail.validationIntegrity} />
      </div>
    </header>
  );
}
