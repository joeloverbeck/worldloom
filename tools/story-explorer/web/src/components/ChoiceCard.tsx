import { Link } from 'react-router-dom';

import type { ChoiceNavigation } from '../api/client';
import { useDisclosure } from './disclosure/use-disclosure';
import { ChildOutcomeVariant } from './ChildOutcomeVariant';

interface ChoiceCardProps {
  choice: ChoiceNavigation;
  worldSlug: string;
  storySlug: string;
}

function pageHref(worldSlug: string, storySlug: string, pageId: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/pages/${encodeURIComponent(
    pageId,
  )}`;
}

function ChoiceSurface({ choice }: { choice: ChoiceNavigation }): JSX.Element {
  return (
    <>
      <span className="choice-card__copy">
        <span className="choice-card__label">{choice.surfaceLabel}</span>
        <span className="choice-card__intent">{choice.playerVisibleIntent}</span>
      </span>
      <span className="choice-card__meta">
        {choice.pressure.map((pressure) => (
          <span className="choice-card__pressure" key={pressure}>
            {pressure}
          </span>
        ))}
        <span className="choice-card__grounding">
          Grounded in {choice.groundedInCount} {choice.groundedInCount === 1 ? 'record' : 'records'}
        </span>
      </span>
    </>
  );
}

export function ChoiceCard({ choice, worldSlug, storySlug }: ChoiceCardProps): JSX.Element {
  const disclosure = useDisclosure();
  const [singleVariant] = choice.childOutcomeVariants;

  if (singleVariant && choice.childOutcomeVariants.length === 1) {
    return (
      <Link className="choice-card choice-card--link" data-choice-id={choice.choiceId} to={pageHref(worldSlug, storySlug, singleVariant.pageId)}>
        <ChoiceSurface choice={choice} />
      </Link>
    );
  }

  return (
    <article className="choice-card-wrap" data-choice-id={choice.choiceId} tabIndex={-1}>
      <button type="button" className="choice-card choice-card--button" {...disclosure.triggerProps}>
        <ChoiceSurface choice={choice} />
        <span className="choice-card__variant-count">
          {choice.childOutcomeVariants.length} {choice.childOutcomeVariants.length === 1 ? 'outcome' : 'outcomes'}
        </span>
      </button>
      <div className="choice-card__variants" {...disclosure.contentProps}>
        {choice.childOutcomeVariants.map((variant) => (
          <ChildOutcomeVariant
            key={`${variant.pageId}-${variant.branchId}-${variant.turnIndex}`}
            variant={variant}
            worldSlug={worldSlug}
            storySlug={storySlug}
          />
        ))}
      </div>
    </article>
  );
}
