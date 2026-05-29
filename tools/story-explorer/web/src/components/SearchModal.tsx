import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { search, type SearchGroup, type SearchHit, type SearchResults } from '../api/client';

interface SearchModalProps {
  worldSlug: string;
  storySlug: string;
  isOpen: boolean;
  onClose: () => void;
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading'; q: string }
  | { kind: 'loaded'; q: string; results: SearchResults }
  | { kind: 'error'; q: string };

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

// Wire each hit to its containing segment: scene container → scene detail;
// unscened range / branch-level → the timeline focused on the run start.
function jumpHref(worldSlug: string, storySlug: string, hit: SearchHit): string {
  const base = `/worlds/${encodeSegment(worldSlug)}/stories/${encodeSegment(storySlug)}`;
  const container = hit.container;
  if (container.kind === 'scene') {
    return `${base}/scenes/${encodeSegment(container.sceneId)}`;
  }
  if (container.kind === 'unscened_range') {
    return `${base}/timeline?branch=${encodeSegment(container.branchId)}&focus=${encodeSegment(container.startPg)}`;
  }
  return container.branchId === null ? base : `${base}/timeline?branch=${encodeSegment(container.branchId)}`;
}

function HitRow({
  hit,
  worldSlug,
  storySlug,
  onJump,
}: {
  hit: SearchHit;
  worldSlug: string;
  storySlug: string;
  onJump: () => void;
}): JSX.Element {
  return (
    <li className="search-modal__hit">
      <Link
        className="search-modal__hit-jump"
        data-search-result
        to={jumpHref(worldSlug, storySlug, hit)}
        onClick={onJump}
      >
        <span className="search-modal__hit-title">{hit.title}</span>
        <span className="search-modal__hit-kind">{hit.kind}</span>
        <span className="search-modal__hit-domain">{hit.domain}</span>
      </Link>
      <p className="search-modal__hit-excerpt">{hit.excerpt}</p>
      <a className="search-modal__hit-raw" href={hit.expandable.href}>
        Open raw source
      </a>
    </li>
  );
}

function GroupSection({
  group,
  worldSlug,
  storySlug,
  onJump,
}: {
  group: SearchGroup;
  worldSlug: string;
  storySlug: string;
  onJump: () => void;
}): JSX.Element {
  return (
    <section className="search-modal__group" aria-label={group.container.label}>
      <h3 className="search-modal__group-title">{group.container.label}</h3>
      <ul className="search-modal__hits">
        {group.hits.map((hit, index) => (
          <HitRow
            key={`${hit.kind}:${hit.recordId ?? ''}:${hit.domain}:${index}`}
            hit={hit}
            worldSlug={worldSlug}
            storySlug={storySlug}
            onJump={onJump}
          />
        ))}
      </ul>
    </section>
  );
}

export function SearchModal({ worldSlug, storySlug, isOpen, onClose }: SearchModalProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [q, setQ] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  // Capture the invoker on open and restore focus to it on close (WAI-ARIA APG).
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus();
    };
  }, [isOpen]);

  const runSearch = useCallback(
    (query: string): void => {
      const trimmed = query.trim();
      if (trimmed === '') {
        setState({ kind: 'idle' });
        return;
      }
      setState({ kind: 'loading', q: trimmed });
      void search(worldSlug, storySlug, trimmed)
        .then(({ payload }) => setState({ kind: 'loaded', q: trimmed, results: payload }))
        .catch(() => setState({ kind: 'error', q: trimmed }));
    },
    [storySlug, worldSlug],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  // Arrow-key navigation between result jump links.
  function handleResultsKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const links = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('[data-search-result]') ?? []);
    if (links.length === 0) {
      return;
    }
    const currentIndex = links.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + delta + links.length) % links.length;
    links[nextIndex]?.focus();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="search-modal" role="presentation" onKeyDown={handleKeyDown}>
      <button
        aria-label="Close search backdrop"
        className="search-modal__backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="search-modal__panel"
        ref={dialogRef}
        role="dialog"
      >
        <div className="search-modal__header">
          <h2 id={titleId}>Search · {storySlug}</h2>
          <button className="search-modal__close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form
          className="search-modal__form"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(q);
          }}
        >
          <label htmlFor="search-modal-input">Query</label>
          <input
            id="search-modal-input"
            ref={inputRef}
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search scenes, ticks, records…"
          />
          <button type="submit">Search</button>
        </form>

        <div aria-live="polite" className="search-modal__status">
          {state.kind === 'loading' ? <p role="status">Searching for “{state.q}”.</p> : null}
          {state.kind === 'error' ? <p role="alert">Search failed for “{state.q}”.</p> : null}
          {state.kind === 'loaded' && state.results.degradedDirectRead ? (
            <p role="status">
              The world index is not fresh ({state.results.indexStatus.kind}); search results are unavailable rather than
              fabricated.
            </p>
          ) : null}
          {state.kind === 'loaded' && !state.results.degradedDirectRead ? (
            <p role="status">
              {state.results.total} {state.results.total === 1 ? 'result' : 'results'} for “{state.q}”.
            </p>
          ) : null}
        </div>

        {state.kind === 'loaded' && state.results.groups.length > 0 ? (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div className="search-modal__results" onKeyDown={handleResultsKeyDown}>
            {state.results.groups.map((group, index) => (
              <GroupSection
                key={`${group.container.kind}:${index}`}
                group={group}
                worldSlug={worldSlug}
                storySlug={storySlug}
                onJump={onClose}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
