import type { ScenePublicationState, SceneTimelineSegment } from '../api/client';
import { PgTick } from './PgTick';

interface SceneSegmentCardProps {
  segment: SceneTimelineSegment;
  onSelectPage: (pageId: string) => void;
}

function publicationChipTone(state: ScenePublicationState): string {
  switch (state) {
    case 'attached:PASS':
      return 'success';
    case 'attached:WARN':
      return 'warning';
    case 'attached:FAIL':
      return 'error';
    case 'superseded':
      return 'muted';
    case 'prose-present':
      return 'info';
    case 'planned':
      return 'info';
  }
  const exhaustive: never = state;
  return exhaustive;
}

function PublicationChip({ state }: { state: ScenePublicationState }): JSX.Element {
  return (
    <span className={`publication-chip publication-chip--${publicationChipTone(state)}`} data-testid="publication-chip">
      {state}
    </span>
  );
}

export function SceneSegmentCard({ segment, onSelectPage }: SceneSegmentCardProps): JSX.Element {
  return (
    <article
      className={`timeline-segment scene-segment${segment.focused ? ' timeline-segment--focused' : ''}`}
      aria-label={`Scene ${segment.sceneId}`}
    >
      <header className="scene-segment__header">
        <h3 className="scene-segment__title">{segment.sceneId}</h3>
        <PublicationChip state={segment.publicationState} />
      </header>
      <p className="scene-segment__range">
        {segment.startPageId} → {segment.endPageId}
      </p>
      <ol className="pg-tick-row" aria-label={`Pages in scene ${segment.sceneId}`}>
        {segment.pageIds.map((pageId) => (
          <li key={pageId}>
            <PgTick pageId={pageId} onSelect={onSelectPage} />
          </li>
        ))}
      </ol>
    </article>
  );
}
