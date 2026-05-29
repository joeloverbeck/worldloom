import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getStateTickXray, type IndexStatus, type StateTickXray } from '../api/client';
import { XRayPanel } from './xray/XRayPanel';

interface StateTickDrawerProps {
  worldSlug: string;
  storySlug: string;
  // When provided, opens the drawer focused on this page (sets ?focus=<pageId>).
  pageId?: string | null;
}

type TickLoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; pageId: string }
  | { kind: 'loaded'; pageId: string; tick: StateTickXray; worldIndexStatus: IndexStatus | null }
  | { kind: 'error'; pageId: string };

const PG_FOCUS_PATTERN = /^PG-\d+$/;

function focusedPageId(searchParams: URLSearchParams): string | null {
  const focus = searchParams.get('focus');
  return focus !== null && PG_FOCUS_PATTERN.test(focus) ? focus : null;
}

export function StateTickDrawer({ worldSlug, storySlug, pageId = null }: StateTickDrawerProps): JSX.Element | null {
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TickLoadState>({ kind: 'idle' });

  // A preset ?focus opens on load; a provided pageId prop opens the drawer by setting ?focus.
  useEffect(() => {
    if (pageId !== null && PG_FOCUS_PATTERN.test(pageId) && searchParams.get('focus') !== pageId) {
      const next = new URLSearchParams(searchParams);
      next.set('focus', pageId);
      setSearchParams(next, { replace: false });
    }
  }, [pageId, searchParams, setSearchParams]);

  const openPageId = focusedPageId(searchParams);

  function close(): void {
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: false });
  }

  useEffect(() => {
    if (openPageId === null) {
      setState({ kind: 'idle' });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: 'loading', pageId: openPageId });

    void getStateTickXray(worldSlug, storySlug, openPageId)
      .then(({ envelope, payload }) => {
        if (!cancelled) {
          setState({
            kind: 'loaded',
            pageId: openPageId,
            tick: payload,
            worldIndexStatus: envelope?.worldIndexStatus ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error', pageId: openPageId });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [openPageId, storySlug, worldSlug]);

  useEffect(() => {
    if (openPageId === null) {
      return undefined;
    }

    window.requestAnimationFrame(() => dialogRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        close();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPageId]);

  if (openPageId === null) {
    return null;
  }

  return (
    <div className="state-tick-drawer" role="presentation">
      <button
        aria-label="Close state tick drawer backdrop"
        className="state-tick-drawer__backdrop"
        onClick={close}
        type="button"
      />
      <div
        aria-labelledby="state-tick-drawer-title"
        aria-modal="true"
        className="state-tick-drawer__panel"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="state-tick-drawer__header">
          <h2 id="state-tick-drawer-title">State X-Ray · {openPageId}</h2>
          <button className="state-tick-drawer__close" onClick={close} type="button">
            Close
          </button>
        </div>
        {state.kind === 'loading' ? <p role="status">Loading state tick {state.pageId}.</p> : null}
        {state.kind === 'error' ? <p role="alert">Unable to load state tick {state.pageId}.</p> : null}
        {state.kind === 'loaded' ? (
          <XRayPanel
            tick={state.tick}
            storySlug={storySlug}
            worldIndexStatus={state.worldIndexStatus}
            worldSlug={worldSlug}
          />
        ) : null}
      </div>
    </div>
  );
}
