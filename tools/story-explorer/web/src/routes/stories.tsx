import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { EnvelopedResult, StorySummary, WorldSummary } from '../api/client';
import { getWorld, listStories } from '../api/client';
import { useIndexStatusBanner } from '../hooks/use-index-status-banner';

interface StoryListResult {
  world: EnvelopedResult<WorldSummary>;
  stories: EnvelopedResult<StorySummary[]>;
}

interface StoryStatusBadgeModel {
  label: string;
  tone: 'success' | 'warning' | 'error' | 'info';
}

export async function storyListLoader({ params }: LoaderFunctionArgs): Promise<StoryListResult> {
  const worldSlug = params.slug;

  if (!worldSlug) {
    throw new Error('World slug is required to load stories.');
  }

  const [world, stories] = await Promise.all([getWorld(worldSlug), listStories(worldSlug)]);

  return { world, stories };
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function latestPageLabel(story: StorySummary): string {
  return story.latestPageId === null ? 'Latest: none indexed' : `Latest: ${story.latestPageId}`;
}

export function storyStatusBadge(status: StorySummary['indexStatus']): StoryStatusBadgeModel {
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

function StoryStatusBadge({ status }: { status: StorySummary['indexStatus'] }): JSX.Element {
  const badge = storyStatusBadge(status);

  return <span className={`story-status-badge story-status-badge--${badge.tone}`}>{badge.label}</span>;
}

function StoryCard({ story }: { story: StorySummary }): JSX.Element {
  return (
    <li>
      <Link
        className="story-card"
        to={`/worlds/${encodeURIComponent(story.worldSlug)}/stories/${encodeURIComponent(story.storySlug)}/entry`}
      >
        <span className="story-card__topline">
          <span className="story-card__title">{story.title ?? 'Untitled story'}</span>
          {story.rootPageId === null ? <span className="story-card__warning">PG-1 missing</span> : null}
        </span>
        <span className="story-card__slug">{story.storySlug}</span>
        <span className="story-card__stats">
          <span>{pluralize(story.pageCount, 'page')}</span>
          <span>{pluralize(story.leafPageIds.length, 'leaf', 'leaves')}</span>
          <span>{pluralize(story.renderedProseCount, 'prose page')}</span>
        </span>
        <span className="story-card__meta">
          <span>{latestPageLabel(story)}</span>
          <StoryStatusBadge status={story.indexStatus} />
        </span>
      </Link>
    </li>
  );
}

function EmptyStoryList(): JSX.Element {
  return (
    <section className="empty-state" aria-labelledby="stories-empty-title">
      <h2 id="stories-empty-title">No story bundles under this world.</h2>
      <p>
        Use <code>/branching-story-bootstrap</code> to create one, then return here to inspect the bundle.
      </p>
    </section>
  );
}

export function StoriesRoute(): JSX.Element {
  const {
    world: { envelope: worldEnvelope, payload: world },
    stories: { envelope: storiesEnvelope, payload: stories },
  } = useLoaderData() as StoryListResult;
  const indexStatusBanner = useIndexStatusBanner(storiesEnvelope?.worldIndexStatus ? storiesEnvelope : worldEnvelope);

  return (
    <main className="app-shell stories-route" aria-labelledby="stories-title">
      <header className="route-header">
        <p className="route-kicker">{world.worldSlug}</p>
        <h1 id="stories-title">{world.displayName} Stories</h1>
      </header>
      {indexStatusBanner}
      {stories.length === 0 ? (
        <EmptyStoryList />
      ) : (
        <ul className="story-grid" aria-label={`Stories in ${world.displayName}`}>
          {stories.map((story) => (
            <StoryCard key={story.storySlug} story={story} />
          ))}
        </ul>
      )}
    </main>
  );
}
