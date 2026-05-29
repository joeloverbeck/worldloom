import { useEffect, useState } from 'react';

import { getSceneProse } from '../api/client';
import { sanitizeMarkdown } from '../lib/sanitize-markdown';
import { RouteLoading } from './RouteLoading';

interface SceneProsePanelProps {
  worldSlug: string;
  storySlug: string;
  sceneId: string;
  // Presence is derived from SceneDetail.artifactAvailability.hasProse (SPEC-96
  // presence-based publication model). When false the panel shows the
  // "prose not attached" state and never fetches — prose is publication output,
  // never authoritative state (FOUNDATIONS §Story Bundles §4/§4a).
  hasProse: boolean;
}

type ProseLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; body: string }
  | { kind: 'error' };

function ProseNotAttached(): JSX.Element {
  return (
    <div className="scene-prose-panel__empty" data-testid="scene-prose-empty">
      <p className="scene-prose-panel__empty-title">Prose not attached.</p>
      <p>
        This scene has no rendered prose yet. Its plan, state x-ray, event deltas, and records remain
        inspectable alongside this panel.
      </p>
    </div>
  );
}

export function SceneProsePanel({ worldSlug, storySlug, sceneId, hasProse }: SceneProsePanelProps): JSX.Element {
  const [state, setState] = useState<ProseLoadState>({ kind: 'idle' });

  useEffect(() => {
    if (!hasProse) {
      setState({ kind: 'idle' });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    void getSceneProse(worldSlug, storySlug, sceneId)
      .then(({ payload }) => {
        if (cancelled) {
          return;
        }
        // Prose artifacts are markdown text; receipts (Record bodies) never route here.
        const body = typeof payload.body === 'string' ? payload.body : '';
        setState({ kind: 'loaded', body });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasProse, sceneId, storySlug, worldSlug]);

  return (
    <section className="scene-prose-panel" aria-labelledby="scene-prose-title">
      <h2 id="scene-prose-title">Scene prose</h2>
      {!hasProse ? <ProseNotAttached /> : null}
      {hasProse && state.kind === 'loading' ? <RouteLoading label="Loading scene prose..." /> : null}
      {hasProse && state.kind === 'error' ? (
        <p className="scene-prose-panel__error" role="alert">
          Unable to load scene prose for {sceneId}.
        </p>
      ) : null}
      {hasProse && state.kind === 'loaded' ? (
        state.body.trim() === '' ? (
          <ProseNotAttached />
        ) : (
          <div
            className="prose scene-prose-panel__body"
            data-testid="scene-prose-body"
            // Rendered prose is publication output, sanitized before display; it is
            // never edited and never treated as authoritative state.
            dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(state.body) }}
          />
        )
      ) : null}
    </section>
  );
}
