import { useEffect, useState } from 'react';

import { getScenePlan } from '../api/client';
import { sanitizeMarkdown } from '../lib/sanitize-markdown';
import { RouteLoading } from './RouteLoading';

interface ScenePlanPanelProps {
  worldSlug: string;
  storySlug: string;
  sceneId: string;
  // Presence is derived from SceneDetail.artifactAvailability.hasPlan.
  hasPlan: boolean;
}

type PlanLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; body: string; sourcePath: string }
  | { kind: 'error' };

export function ScenePlanPanel({ worldSlug, storySlug, sceneId, hasPlan }: ScenePlanPanelProps): JSX.Element {
  const [state, setState] = useState<PlanLoadState>({ kind: 'idle' });

  useEffect(() => {
    if (!hasPlan) {
      setState({ kind: 'idle' });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    void getScenePlan(worldSlug, storySlug, sceneId)
      .then(({ payload }) => {
        if (cancelled) {
          return;
        }
        const body = typeof payload.body === 'string' ? payload.body : '';
        setState({ kind: 'loaded', body, sourcePath: payload.sourcePath });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasPlan, sceneId, storySlug, worldSlug]);

  return (
    <section className="scene-plan-panel" aria-labelledby="scene-plan-title">
      <h2 id="scene-plan-title">Scene plan</h2>
      {!hasPlan ? (
        <p className="scene-plan-panel__empty" data-testid="scene-plan-empty">
          No scene plan recorded yet.
        </p>
      ) : null}
      {hasPlan && state.kind === 'loading' ? <RouteLoading label="Loading scene plan..." /> : null}
      {hasPlan && state.kind === 'error' ? (
        <p className="scene-plan-panel__error" role="alert">
          Unable to load scene plan for {sceneId}.
        </p>
      ) : null}
      {hasPlan && state.kind === 'loaded' ? (
        <>
          <p className="scene-plan-panel__source">{state.sourcePath}</p>
          {/* The plan is the author's render brief, displayed distinctly from prose so it
              is never mistaken for publication output. */}
          <div
            className="scene-plan-panel__body"
            data-testid="scene-plan-body"
            dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(state.body) }}
          />
        </>
      ) : null}
    </section>
  );
}
