import { useEffect, useRef, useState } from 'react';

import { getRecord, type RecordCard } from '../../api/client';
import { RecordCardCompact } from './RecordCardCompact';
import { BrokenReferenceChip } from './BrokenReferenceChip';

interface LinkedRecordPeekProps {
  recordId: string | null;
  storySlug: string;
  worldSlug: string;
  onClose: () => void;
}

type PeekState =
  | { kind: 'idle' }
  | { kind: 'loading'; recordId: string }
  | { kind: 'loaded'; recordId: string; recordCard: RecordCard }
  | { kind: 'error'; recordId: string };

export function LinkedRecordPeek({ recordId, storySlug, worldSlug, onClose }: LinkedRecordPeekProps): JSX.Element | null {
  const panelRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<PeekState>({ kind: 'idle' });

  useEffect(() => {
    if (recordId === null) {
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading', recordId });

    void getRecord(worldSlug, storySlug, recordId)
      .then(({ payload }) => {
        if (!cancelled) {
          setState({ kind: 'loaded', recordId, recordCard: payload.recordCard });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error', recordId });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [recordId, storySlug, worldSlug]);

  useEffect(() => {
    if (recordId !== null) {
      window.requestAnimationFrame(() => panelRef.current?.focus());
    }
  }, [recordId]);

  useEffect(() => {
    if (recordId === null) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, recordId]);

  if (recordId === null) {
    return null;
  }

  return (
    <div className="linked-record-peek" role="presentation">
      <button aria-label="Close linked record peek backdrop" className="linked-record-peek__backdrop" onClick={onClose} type="button" />
      <aside
        aria-labelledby="linked-record-peek-title"
        className="linked-record-peek__panel"
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="linked-record-peek__header">
          <h3 id="linked-record-peek-title">Linked Record</h3>
          <button className="linked-record-peek__close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <span className="record-chip record-chip--warning">Not active on this page</span>
        {state.kind === 'loading' ? <p role="status">Loading {state.recordId}.</p> : null}
        {state.kind === 'loaded' ? <RecordCardCompact recordCard={state.recordCard} /> : null}
        {state.kind === 'error' ? <BrokenReferenceChip recordId={state.recordId} /> : null}
      </aside>
    </div>
  );
}
