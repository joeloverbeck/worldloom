import { Link } from 'react-router-dom';

import type { ChildOutcomeVariant as ChildOutcomeVariantModel } from '../api/client';

interface ChildOutcomeVariantProps {
  variant: ChildOutcomeVariantModel;
  worldSlug: string;
  storySlug: string;
}

function pageHref(worldSlug: string, storySlug: string, pageId: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/pages/${encodeURIComponent(
    pageId,
  )}`;
}

function variantLabel(variant: ChildOutcomeVariantModel): string {
  return variant.outcomeRoute ?? variant.resolutionPreview ?? 'Outcome';
}

export function ChildOutcomeVariant({ variant, worldSlug, storySlug }: ChildOutcomeVariantProps): JSX.Element {
  return (
    <Link className="child-outcome-variant" to={pageHref(worldSlug, storySlug, variant.pageId)}>
      <span className="child-outcome-variant__page">{variant.pageId}</span>
      <span className="child-outcome-variant__branch">{variant.branchId}</span>
      <span className="child-outcome-variant__label">{variantLabel(variant)}</span>
    </Link>
  );
}
