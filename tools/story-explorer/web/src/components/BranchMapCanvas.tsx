import { useEffect, useId, useRef, useState } from 'react';

import { getBranchMap, type BranchMapGraph, type BranchMapNode } from '../api/client';

interface BranchMapCanvasProps {
  worldSlug: string;
  storySlug: string;
  focus: string;
  isOpen: boolean;
  onClose: () => void;
}

type CanvasState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; graph: BranchMapGraph }
  | { kind: 'error' };

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function nodeDescription(node: BranchMapNode): string {
  switch (node.kind) {
    case 'scene':
      return `${node.id} · ${node.publicationState}`;
    case 'unscened_run':
      return node.label;
    case 'branch_split':
      return `Branch split at ${node.pageId} → ${node.childBranchIds.join(', ')}`;
    case 'choice_surface':
      return `${node.choiceCount} ${node.choiceCount === 1 ? 'choice' : 'choices'} at ${node.pageId}`;
    case 'terminal_marker':
      return `Terminal (${node.reason}) at ${node.pageId}`;
  }
}

function BranchColumn({ branchId, nodes }: { branchId: string; nodes: BranchMapNode[] }): JSX.Element {
  return (
    <section className="branch-map__branch" aria-label={`Branch ${branchId}`}>
      <h3 className="branch-map__branch-title">{branchId}</h3>
      <ul className="branch-map__nodes">
        {nodes.map((node) => (
          <li
            key={node.id}
            className="branch-map__node"
            data-node-kind={node.kind}
            data-node-id={node.id}
            aria-current={node.focused ? 'true' : undefined}
          >
            <span className="branch-map__node-kind">{node.kind}</span>
            <span className="branch-map__node-label">{nodeDescription(node)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BranchMapCanvas({ worldSlug, storySlug, focus, isOpen, onClose }: BranchMapCanvasProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [state, setState] = useState<CanvasState>({ kind: 'idle' });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setState({ kind: 'idle' });
      return undefined;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    void getBranchMap(worldSlug, storySlug, focus)
      .then(({ payload }) => {
        if (!cancelled) {
          setState({ kind: 'loaded', graph: payload });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, focus, storySlug, worldSlug]);

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

  if (!isOpen) {
    return null;
  }

  const nodesByBranch = (graph: BranchMapGraph): Array<{ branchId: string; nodes: BranchMapNode[] }> =>
    graph.branchIds.map((branchId) => ({
      branchId,
      nodes: graph.nodes.filter((node) => node.branchId === branchId),
    }));

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="branch-map" role="presentation" onKeyDown={handleKeyDown}>
      <button aria-label="Close branch map backdrop" className="branch-map__backdrop" onClick={onClose} type="button" />
      <div aria-labelledby={titleId} aria-modal="true" className="branch-map__panel" ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className="branch-map__header">
          <h2 id={titleId}>Branch map · {focus}</h2>
          <button className="branch-map__close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div aria-live="polite" className="branch-map__status">
          {state.kind === 'loading' ? <p role="status">Loading branch map for {focus}.</p> : null}
          {state.kind === 'error' ? <p role="alert">Unable to load branch map for {focus}.</p> : null}
          {state.kind === 'loaded' && state.graph.degradedDirectRead ? (
            <p role="status">
              The world index is not fresh ({state.graph.indexStatus.kind}); the branch map is unavailable rather than
              fabricated.
            </p>
          ) : null}
          {state.kind === 'loaded' && !state.graph.degradedDirectRead ? (
            <p role="status">
              {state.graph.nodes.length} nodes across {state.graph.branchIds.length}{' '}
              {state.graph.branchIds.length === 1 ? 'branch' : 'branches'}.
            </p>
          ) : null}
        </div>

        {state.kind === 'loaded' && !state.graph.degradedDirectRead ? (
          <div className="branch-map__canvas" role="group" aria-label="Branch map scene segments">
            {nodesByBranch(state.graph).map(({ branchId, nodes }) => (
              <BranchColumn key={branchId} branchId={branchId} nodes={nodes} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
