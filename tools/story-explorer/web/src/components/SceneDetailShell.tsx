import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getStateTickXray,
  type IndexStatus,
  type SceneDetail,
  type ScenePublicationState,
  type StateTickXray,
} from '../api/client';
import { useIndexStatusBannerFromStatus } from '../hooks/use-index-status-banner';
import { ActiveRecordsPanel } from './ActiveRecordsPanel';
import { ChoiceSurfacePanel } from './ChoiceSurfacePanel';
import { PgTick } from './PgTick';
import { RouteLoading } from './RouteLoading';
import { ScenePlanPanel } from './ScenePlanPanel';
import { SceneProsePanel } from './SceneProsePanel';
import { SceneReceiptPanel } from './SceneReceiptPanel';
import { StateDeltaPanel } from './StateDeltaPanel';
import { ValidationFreshnessPanel } from './ValidationFreshnessPanel';
import { XRayPanel } from './xray/XRayPanel';

interface SceneDetailShellProps {
  scene: SceneDetail;
  worldSlug: string;
  storySlug: string;
}

const PG_FOCUS_PATTERN = /^PG-\d+$/;

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
    case 'planned':
      return 'info';
  }
}

function pgRangeLabel(pageIds: string[]): string {
  const first = pageIds[0];
  const last = pageIds[pageIds.length - 1];
  if (first === undefined || last === undefined) {
    return 'no pages';
  }
  return first === last ? first : `${first} → ${last}`;
}

type TickLoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; pageId: string }
  | { kind: 'loaded'; pageId: string; tick: StateTickXray; worldIndexStatus: IndexStatus | null }
  | { kind: 'error'; pageId: string };

// The co-equal right panel: always renders the focused PG's x-ray inline (not a
// modal), so author state is inspectable alongside prose (author-x-ray-first).
function SceneXrayRegion({
  worldSlug,
  storySlug,
  focusPg,
}: {
  worldSlug: string;
  storySlug: string;
  focusPg: string | null;
}): JSX.Element {
  const [state, setState] = useState<TickLoadState>({ kind: 'idle' });

  useEffect(() => {
    if (focusPg === null) {
      setState({ kind: 'idle' });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: 'loading', pageId: focusPg });

    void getStateTickXray(worldSlug, storySlug, focusPg)
      .then(({ envelope, payload }) => {
        if (!cancelled) {
          setState({
            kind: 'loaded',
            pageId: focusPg,
            tick: payload,
            worldIndexStatus: envelope?.worldIndexStatus ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error', pageId: focusPg });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [focusPg, storySlug, worldSlug]);

  return (
    <section className="scene-detail-shell__xray" aria-labelledby="scene-detail-xray-title">
      <h2 id="scene-detail-xray-title">State x-ray{focusPg !== null ? ` · ${focusPg}` : ''}</h2>
      {focusPg === null ? <p className="scene-detail-shell__xray-empty">This scene has no pages to inspect.</p> : null}
      {state.kind === 'loading' ? <RouteLoading label={`Loading state tick ${state.pageId}...`} /> : null}
      {state.kind === 'error' ? (
        <p role="alert">Unable to load state tick {state.pageId}.</p>
      ) : null}
      {state.kind === 'loaded' ? (
        <XRayPanel
          tick={state.tick}
          storySlug={storySlug}
          worldIndexStatus={state.worldIndexStatus}
          worldSlug={worldSlug}
        />
      ) : null}
    </section>
  );
}

export function SceneDetailShell({ scene, worldSlug, storySlug }: SceneDetailShellProps): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const banner = useIndexStatusBannerFromStatus(scene.indexStatus);

  // PG focus is query state (?focusPg=PG-N), never a path segment; constrain it
  // to this scene's pages and fall back to the first included page.
  const requestedFocus = searchParams.get('focusPg');
  const defaultFocus = scene.pageIds[0] ?? null;
  const focusPg =
    requestedFocus !== null && PG_FOCUS_PATTERN.test(requestedFocus) && scene.pageIds.includes(requestedFocus)
      ? requestedFocus
      : defaultFocus;

  function handleSelectPage(pageId: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('focusPg', pageId);
    setSearchParams(next);
  }

  const focusedPage = scene.includedPages.find((page) => page.pageId === focusPg) ?? scene.includedPages[0] ?? null;
  const activeRecordCounts = focusedPage?.activeRecordCounts ?? {};

  // Prose-first precedence: prose when present, else plan, else "prose not attached".
  const leftPanel = scene.artifactAvailability.hasProse ? (
    <SceneProsePanel worldSlug={worldSlug} storySlug={storySlug} sceneId={scene.sceneId} hasProse />
  ) : scene.artifactAvailability.hasPlan ? (
    <ScenePlanPanel worldSlug={worldSlug} storySlug={storySlug} sceneId={scene.sceneId} hasPlan />
  ) : (
    <SceneProsePanel worldSlug={worldSlug} storySlug={storySlug} sceneId={scene.sceneId} hasProse={false} />
  );

  return (
    <main className="app-shell scene-detail-shell" aria-labelledby="scene-detail-title">
      <header className="route-header scene-detail-shell__header">
        <p className="route-kicker">
          {worldSlug} · {storySlug}
        </p>
        <h1 id="scene-detail-title">{scene.sceneId}</h1>
        <p className="scene-detail-shell__meta">
          <span>{scene.branchId}</span>
          <span>{pgRangeLabel(scene.pageIds)}</span>
          <span>{scene.coverageStatus}</span>
        </p>
        <span
          className={`publication-chip publication-chip--${publicationChipTone(scene.publicationState)}`}
          data-testid="publication-chip"
        >
          {scene.publicationState}
        </span>
      </header>

      {banner}

      <div className="scene-detail-shell__body">
        <div className="scene-detail-shell__left">
          {leftPanel}
          <SceneReceiptPanel
            worldSlug={worldSlug}
            storySlug={storySlug}
            sceneId={scene.sceneId}
            hasReceipt={scene.artifactAvailability.hasReceipt}
          />
        </div>
        <div className="scene-detail-shell__right">
          <SceneXrayRegion worldSlug={worldSlug} storySlug={storySlug} focusPg={focusPg} />
        </div>
      </div>

      <div className="scene-detail-shell__rail" aria-label="Scene workbench rail">
        <section className="scene-detail-shell__pages" aria-labelledby="scene-detail-pages-title">
          <h2 id="scene-detail-pages-title">Pages</h2>
          {scene.pageIds.length === 0 ? (
            <p>No committed pages in this scene.</p>
          ) : (
            <ul className="scene-detail-shell__pg-ticks" aria-label="Scene pages">
              {scene.pageIds.map((pageId) => (
                <li key={pageId}>
                  <PgTick pageId={pageId} onSelect={handleSelectPage} focused={pageId === focusPg} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <StateDeltaPanel eventDeltas={scene.eventDeltas} />

        <section className="scene-detail-shell__choice-surface" aria-labelledby="scene-detail-choice-title">
          <h2 id="scene-detail-choice-title">End choice surface</h2>
          {scene.endChoiceSurface === null ? (
            <p>No emitted choice surface at this scene's final page.</p>
          ) : (
            <ChoiceSurfacePanel choiceSurface={scene.endChoiceSurface} onSelectPage={handleSelectPage} />
          )}
        </section>

        <ActiveRecordsPanel activeRecordCounts={activeRecordCounts} pageId={focusedPage?.pageId ?? null} />

        <ValidationFreshnessPanel
          publicationState={scene.publicationState}
          artifactAvailability={scene.artifactAvailability}
        />
      </div>
    </main>
  );
}
