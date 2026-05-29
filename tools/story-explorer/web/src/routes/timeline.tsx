import { useLoaderData, useSearchParams, type LoaderFunctionArgs } from 'react-router-dom';

import type { BranchTimeline, EnvelopedResult } from '../api/client';
import { getBranchTimeline } from '../api/client';
import { StateTickDrawer } from '../components/StateTickDrawer';
import { TimelineSegmentList } from '../components/TimelineSegmentList';
import { useIndexStatusBannerFromStatus } from '../hooks/use-index-status-banner';

interface TimelineRouteResult {
  timeline: EnvelopedResult<BranchTimeline>;
  worldSlug: string;
  storySlug: string;
}

export async function timelineLoader({ params, request }: LoaderFunctionArgs): Promise<TimelineRouteResult> {
  const worldSlug = params.slug;
  const storySlug = params.storySlug;

  if (!worldSlug || !storySlug) {
    throw new Error('World slug and story slug are required to load the timeline.');
  }

  // The URL carries `?branch` / `?focus`; SPEC-96's /timeline endpoint expects
  // `branchId` / `focus`. PG focus is query state, not a path segment (SPEC-97 §3).
  const url = new URL(request.url);
  const branchId = url.searchParams.get('branch') ?? undefined;
  const focus = url.searchParams.get('focus') ?? undefined;

  const timeline = await getBranchTimeline(worldSlug, storySlug, { branchId, focus });

  return { timeline, worldSlug, storySlug };
}

export function TimelineRoute(): JSX.Element {
  const {
    timeline: { payload: timeline },
    worldSlug,
    storySlug,
  } = useLoaderData() as TimelineRouteResult;
  const [searchParams, setSearchParams] = useSearchParams();
  const banner = useIndexStatusBannerFromStatus(timeline.indexStatus);

  // Clicking a PG tick deep-links the state-tick x-ray drawer via ?focus=PG-N;
  // StateTickDrawer reads ?focus and opens itself (incl. on initial load).
  function handleSelectPage(pageId: string): void {
    const next = new URLSearchParams(searchParams);
    next.set('focus', pageId);
    setSearchParams(next);
  }

  return (
    <main className="app-shell timeline-route" aria-labelledby="timeline-title">
      <header className="route-header">
        <p className="route-kicker">
          {worldSlug} · {storySlug}
        </p>
        <h1 id="timeline-title">Branch timeline · {timeline.branchId}</h1>
      </header>

      {banner}

      <section className="timeline-route__segments" aria-labelledby="timeline-segments-title">
        <h2 id="timeline-segments-title">Timeline</h2>
        <TimelineSegmentList segments={timeline.segments} onSelectPage={handleSelectPage} />
      </section>

      <StateTickDrawer worldSlug={worldSlug} storySlug={storySlug} />
    </main>
  );
}
