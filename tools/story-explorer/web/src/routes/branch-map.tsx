import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { BranchMapCanvas } from '../components/BranchMapCanvas';

// SPEC-98 §2 item 4 — the /branch-map route hosts the focus-trapped
// BranchMapCanvas drawer (never a permanent dominant graph), reusing the
// SPEC-97 shell. The focus id is seeded from ?focus (SCN-/PG-/CHC-/BR-).
export function BranchMapRoute(): JSX.Element {
  const params = useParams();
  const worldSlug = params.slug ?? '';
  const storySlug = params.storySlug ?? '';
  const [searchParams] = useSearchParams();
  const [focus, setFocus] = useState(searchParams.get('focus') ?? 'BR-1');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <main className="app-shell branch-map-route" aria-labelledby="branch-map-title">
      <header className="route-header">
        <p className="route-kicker">
          {worldSlug} · {storySlug}
        </p>
        <h1 id="branch-map-title">Branch map</h1>
      </header>

      <p>Open the single-layer scene branch map for this story, focused on a scene, tick, choice, or branch.</p>
      <label htmlFor="branch-map-focus">Focus</label>
      <input id="branch-map-focus" type="text" value={focus} onChange={(event) => setFocus(event.target.value)} />
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open branch map
      </button>

      <BranchMapCanvas
        worldSlug={worldSlug}
        storySlug={storySlug}
        focus={focus}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}
