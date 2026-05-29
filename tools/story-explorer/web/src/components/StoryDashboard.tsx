import { useState } from 'react';

import type {
  BranchOverviewSummary,
  ScenePublicationState,
  StoryOverview,
} from '../api/client';
import { useIndexStatusBannerFromStatus } from '../hooks/use-index-status-banner';
import { BranchSelector } from './BranchSelector';
import { CoveragePanel } from './CoveragePanel';

interface StoryDashboardProps {
  overview: StoryOverview;
  indexStatusBanner: React.ReactNode;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function publicationChipTone(state: ScenePublicationState): string {
  switch (state) {
    case 'attached:PASS':
      return 'success';
    case 'attached:WARN':
      return 'warning';
    case 'attached:FAIL':
      return 'error';
    case 'superseded':
      return 'muted';
    case 'prose-present':
      return 'info';
    case 'planned':
      return 'info';
  }
  const exhaustive: never = state;
  return exhaustive;
}

function PublicationChip({ state }: { state: ScenePublicationState }): JSX.Element {
  return (
    <span className={`publication-chip publication-chip--${publicationChipTone(state)}`} data-testid="publication-chip">
      {state}
    </span>
  );
}

function BranchCard({
  overview,
  branch,
  isActive,
}: {
  overview: StoryOverview;
  branch: BranchOverviewSummary;
  isActive: boolean;
}): JSX.Element {
  const base = `/worlds/${encodeURIComponent(overview.worldSlug)}/stories/${encodeURIComponent(overview.storySlug)}`;
  const timelineHref = `${base}/timeline?branch=${encodeURIComponent(branch.branchId)}`;
  const scenesHref = `${base}/scenes?branch=${encodeURIComponent(branch.branchId)}`;

  return (
    <li
      className={`branch-card${isActive ? ' branch-card--active' : ''}`}
      aria-label={`Branch ${branch.branchId}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <h3 className="branch-card__title">{branch.branchId}</h3>
      <dl className="branch-card__facts">
        <div>
          <dt>Root</dt>
          <dd>{branch.rootPageId ?? 'none'}</dd>
        </div>
        <div>
          <dt>Latest</dt>
          <dd>{branch.latestPageId ?? 'none'}</dd>
        </div>
        <div>
          <dt>Latest scene</dt>
          <dd>
            {branch.latestScene === null ? (
              'none'
            ) : (
              <>
                <span className="branch-card__scene-id">{branch.latestScene.sceneId}</span>{' '}
                <PublicationChip state={branch.latestScene.publicationState} />
              </>
            )}
          </dd>
        </div>
      </dl>
      <nav className="branch-card__links" aria-label={`Branch ${branch.branchId} navigation`}>
        <a href={timelineHref}>Timeline</a>
        <a href={scenesHref}>Scenes</a>
      </nav>
    </li>
  );
}

export function StoryDashboard({ overview, indexStatusBanner }: StoryDashboardProps): JSX.Element {
  const fallbackBanner = useIndexStatusBannerFromStatus(overview.indexStatus);
  const banner = indexStatusBanner ?? fallbackBanner;

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    overview.branches[0]?.branchId ?? '',
  );

  const selectedBranch =
    overview.branches.find((branch) => branch.branchId === selectedBranchId) ?? overview.branches[0] ?? null;

  return (
    <main className="app-shell story-dashboard" aria-labelledby="story-dashboard-title">
      <header className="route-header">
        <p className="route-kicker">{overview.worldSlug}</p>
        <h1 id="story-dashboard-title">{overview.title ?? 'Untitled story'}</h1>
        <ul className="story-dashboard__counts" aria-label="Story counts">
          <li>{pluralize(overview.branchCount, 'branch', 'branches')}</li>
          <li>{pluralize(overview.pageCount, 'page')}</li>
          <li>{pluralize(overview.choiceCount, 'choice')}</li>
        </ul>
      </header>

      {banner}

      {overview.branches.length > 0 ? (
        <BranchSelector
          branches={overview.branches}
          selectedBranchId={selectedBranch?.branchId ?? ''}
          onSelect={setSelectedBranchId}
        />
      ) : null}

      <section className="story-dashboard__branches" aria-labelledby="story-dashboard-branches-title">
        <h2 id="story-dashboard-branches-title">Branches</h2>
        {overview.branches.length === 0 ? (
          <p className="story-dashboard__empty">No branches indexed for this story.</p>
        ) : (
          <ul className="branch-grid" aria-label="Branch summaries">
            {overview.branches.map((branch) => (
              <BranchCard
                key={branch.branchId}
                overview={overview}
                branch={branch}
                isActive={branch.branchId === selectedBranch?.branchId}
              />
            ))}
          </ul>
        )}
      </section>

      <CoveragePanel
        sceneCoverageCounts={overview.sceneCoverageCounts}
        unscenedRunCounts={overview.unscenedRunCounts}
      />
    </main>
  );
}
