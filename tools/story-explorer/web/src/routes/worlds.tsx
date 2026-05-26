import { Link, useLoaderData } from 'react-router-dom';

import type { IndexStatus, WorldSummary } from '../api/client';
import { listWorlds } from '../api/client';

interface WorldListResult {
  payload: WorldSummary[];
}

type BadgeTone = 'success' | 'warning' | 'error' | 'info';

interface BadgeModel {
  label: string;
  tone: BadgeTone;
}

export async function worldListLoader(): Promise<WorldListResult> {
  return listWorlds();
}

export function worldStatusBadge(status: IndexStatus, errors: string[]): BadgeModel {
  if (errors.length > 0) {
    return { label: 'Error', tone: 'error' };
  }

  switch (status.kind) {
    case 'fresh':
      return { label: 'Indexed', tone: 'success' };
    case 'missing':
      return { label: 'Missing index', tone: 'warning' };
    case 'stale':
      return { label: 'Stale index', tone: 'info' };
    case 'empty':
      return { label: 'Empty world', tone: 'info' };
    case 'version_mismatch':
    case 'open_failed':
      return { label: 'Error', tone: 'error' };
  }

  const exhaustiveStatus: never = status;
  return exhaustiveStatus;
}

function WorldStatusBadge({ status, errors }: { status: IndexStatus; errors: string[] }): JSX.Element {
  const badge = worldStatusBadge(status, errors);

  return <span className={`world-status-badge world-status-badge--${badge.tone}`}>{badge.label}</span>;
}

function EmptyWorldList(): JSX.Element {
  return (
    <section className="empty-state" aria-labelledby="worlds-empty-title">
      <h2 id="worlds-empty-title">No worlds found in this repository.</h2>
      <p>
        Add a world under the repository's <code>worlds/</code> directory, or review the repository map for the
        expected layout.
      </p>
      <a href="/docs/REPOSITORY-MAP.md">Repository map</a>
    </section>
  );
}

function WorldCard({ world }: { world: WorldSummary }): JSX.Element {
  return (
    <li>
      <Link className="world-card" to={`/worlds/${encodeURIComponent(world.worldSlug)}/stories`}>
        <span className="world-card__topline">
          <span className="world-card__display-name">{world.displayName}</span>
          <WorldStatusBadge status={world.indexStatus} errors={world.errors} />
        </span>
        <span className="world-card__slug">{world.worldSlug}</span>
        <span className="world-card__meta">
          {world.storyCount === 1 ? '1 story' : `${world.storyCount} stories`}
        </span>
      </Link>
    </li>
  );
}

export function WorldsRoute(): JSX.Element {
  const { payload: worlds } = useLoaderData() as WorldListResult;

  return (
    <main className="app-shell worlds-route" aria-labelledby="worlds-title">
      <header className="route-header">
        <h1 id="worlds-title">Worlds</h1>
      </header>
      {worlds.length === 0 ? (
        <EmptyWorldList />
      ) : (
        <ul className="world-grid" aria-label="Available worlds">
          {worlds.map((world) => (
            <WorldCard key={world.worldSlug} world={world} />
          ))}
        </ul>
      )}
    </main>
  );
}
