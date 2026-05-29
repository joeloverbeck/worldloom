interface PgTickProps {
  pageId: string;
  // Opening a PG resolves only to the state-tick x-ray drawer (FOUNDATIONS
  // §Story Bundles §4a: PG is a causal tick, never a reader page).
  onSelect: (pageId: string) => void;
  focused?: boolean;
}

export function PgTick({ pageId, onSelect, focused = false }: PgTickProps): JSX.Element {
  return (
    <button
      type="button"
      className={`pg-tick${focused ? ' pg-tick--focused' : ''}`}
      data-page-id={pageId}
      aria-label={`Inspect state tick ${pageId}`}
      aria-current={focused ? 'true' : undefined}
      onClick={() => onSelect(pageId)}
    >
      {pageId}
    </button>
  );
}
