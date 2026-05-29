import { useEffect, useState } from 'react';

import { getSceneReceipt } from '../api/client';
import { RouteLoading } from './RouteLoading';

interface SceneReceiptPanelProps {
  worldSlug: string;
  storySlug: string;
  sceneId: string;
  // Presence is derived from SceneDetail.artifactAvailability.hasReceipt.
  hasReceipt: boolean;
}

type ReceiptLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; body: Record<string, unknown>; sourcePath: string }
  | { kind: 'error' };

function verdictOf(body: Record<string, unknown>): string | null {
  const verdict = body.verdict;
  return typeof verdict === 'string' ? verdict : null;
}

export function SceneReceiptPanel({ worldSlug, storySlug, sceneId, hasReceipt }: SceneReceiptPanelProps): JSX.Element {
  const [state, setState] = useState<ReceiptLoadState>({ kind: 'idle' });

  useEffect(() => {
    if (!hasReceipt) {
      setState({ kind: 'idle' });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    void getSceneReceipt(worldSlug, storySlug, sceneId)
      .then(({ payload }) => {
        if (cancelled) {
          return;
        }
        const body = typeof payload.body === 'string' ? {} : payload.body;
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
  }, [hasReceipt, sceneId, storySlug, worldSlug]);

  return (
    <section className="scene-receipt-panel" aria-labelledby="scene-receipt-title">
      <h2 id="scene-receipt-title">Scene receipt</h2>
      {!hasReceipt ? (
        <p className="scene-receipt-panel__empty" data-testid="scene-receipt-empty">
          No attachment receipt recorded yet.
        </p>
      ) : null}
      {hasReceipt && state.kind === 'loading' ? <RouteLoading label="Loading scene receipt..." /> : null}
      {hasReceipt && state.kind === 'error' ? (
        <p className="scene-receipt-panel__error" role="alert">
          Unable to load scene receipt for {sceneId}.
        </p>
      ) : null}
      {hasReceipt && state.kind === 'loaded' ? (
        <>
          <p className="scene-receipt-panel__source">{state.sourcePath}</p>
          {verdictOf(state.body) !== null ? (
            <p className="scene-receipt-panel__verdict" data-testid="scene-receipt-verdict">
              Verdict: {verdictOf(state.body)}
            </p>
          ) : null}
          <pre className="scene-receipt-panel__raw" data-testid="scene-receipt-raw">
            {JSON.stringify(state.body, null, 2)}
          </pre>
        </>
      ) : null}
    </section>
  );
}
