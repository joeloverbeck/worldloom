import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { SearchModal } from '../components/SearchModal';

// SPEC-98 §2 item 4 — the /search route hosts the focus-trapped SearchModal.
// The modal is opened from a trigger so focus returns to it on close
// (WAI-ARIA APG), reusing the SPEC-97 shell.
export function SearchRoute(): JSX.Element {
  const params = useParams();
  const worldSlug = params.slug ?? '';
  const storySlug = params.storySlug ?? '';
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <main className="app-shell search-route" aria-labelledby="search-title">
      <header className="route-header">
        <p className="route-kicker">
          {worldSlug} · {storySlug}
        </p>
        <h1 id="search-title">Search</h1>
      </header>

      <p>Search scenes, unscened ranges, state ticks, and records across this story.</p>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open search
      </button>

      <SearchModal worldSlug={worldSlug} storySlug={storySlug} isOpen={open} onClose={() => setOpen(false)} />
    </main>
  );
}
