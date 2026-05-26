import { useEffect, useRef, useState } from 'react';

import { getRawRecord, type RawRecordSource } from '../../api/client';
import { useDisclosure } from '../disclosure/use-disclosure';

interface RawRecordDisclosureProps {
  worldSlug: string;
  storySlug: string;
  recordId: string;
}

type RawRecordState =
  | { status: 'idle' | 'loading'; source: null; error: null }
  | { status: 'loaded'; source: RawRecordSource; error: null }
  | { status: 'error'; source: null; error: string };

export function RawRecordDisclosure({ worldSlug, storySlug, recordId }: RawRecordDisclosureProps): JSX.Element {
  const disclosure = useDisclosure(false);
  const [rawState, setRawState] = useState<RawRecordState>({ status: 'idle', source: null, error: null });
  const requestedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (!disclosure.isOpen || requestedRef.current) {
      return () => {
        cancelled = true;
      };
    }

    requestedRef.current = true;
    setRawState({ status: 'loading', source: null, error: null });

    getRawRecord(worldSlug, storySlug, recordId)
      .then((result) => {
        if (!cancelled) {
          setRawState({ status: 'loaded', source: result.payload, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRawState({
            status: 'error',
            source: null,
            error: error instanceof Error ? error.message : 'Raw record fetch failed.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [disclosure.isOpen, recordId, storySlug, worldSlug]);

  function copyRawBody(): void {
    if (rawState.status === 'loaded') {
      void navigator.clipboard?.writeText(rawState.source.body);
    }
  }

  return (
    <div className="raw-record">
      <button className="raw-record__trigger" type="button" {...disclosure.triggerProps}>
        View raw record
      </button>
      <div className="raw-record__panel" {...disclosure.contentProps}>
        {rawState.status === 'loading' ? <p>Loading raw record...</p> : null}
        {rawState.status === 'error' ? <p role="alert">{rawState.error}</p> : null}
        {rawState.status === 'loaded' ? (
          <div className="raw-record__body">
            <dl className="raw-record__meta">
              <div>
                <dt>Source path</dt>
                <dd>{rawState.source.sourcePath}</dd>
              </div>
              <div>
                <dt>Content hash</dt>
                <dd>{rawState.source.contentHash}</dd>
              </div>
            </dl>
            <button className="raw-record__copy" type="button" onClick={copyRawBody}>
              Copy
            </button>
            <pre className="raw-record__code">
              <code className="language-yaml">{rawState.source.body}</code>
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
