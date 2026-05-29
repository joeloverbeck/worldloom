import type { ChoiceSurface } from '../api/client';
import { PgTick } from './PgTick';

interface ChoiceSurfacePanelProps {
  // The emitted-choice surface anchored at its end PG.
  choiceSurface: ChoiceSurface;
  onSelectPage: (pageId: string) => void;
  focused?: boolean;
}

export function ChoiceSurfacePanel({ choiceSurface, onSelectPage, focused = false }: ChoiceSurfacePanelProps): JSX.Element {
  return (
    <article
      className={`timeline-segment choice-surface${focused ? ' timeline-segment--focused' : ''}`}
      aria-label={`Choice surface at ${choiceSurface.pageId}`}
    >
      <header className="choice-surface__header">
        <h3 className="choice-surface__title">Choice surface</h3>
        <PgTick pageId={choiceSurface.pageId} onSelect={onSelectPage} focused={focused} />
      </header>
      {choiceSurface.emittedChoices.length > 0 ? (
        <ul className="choice-surface__choices" aria-label={`Emitted choices at ${choiceSurface.pageId}`}>
          {choiceSurface.emittedChoices.map((choice) => (
            <li className="choice-surface__choice" data-choice-id={choice.choiceId} key={choice.choiceId}>
              <span className="choice-surface__label">{choice.surfaceLabel}</span>
              <span className="choice-surface__intent">{choice.playerVisibleIntent}</span>
              <span className="choice-surface__meta">
                {choice.pressure.map((pressure) => (
                  <span className="choice-surface__pressure" key={pressure}>
                    {pressure}
                  </span>
                ))}
                <span className="choice-surface__grounding">
                  Grounded in {choice.groundedInCount} {choice.groundedInCount === 1 ? 'record' : 'records'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="choice-surface__empty">No choices emitted at this page.</p>
      )}
    </article>
  );
}
