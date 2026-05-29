import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { EnvelopedResult, StoryOverview } from '../api/client';
import { getStoryOverview } from '../api/client';
import { StoryDashboard } from '../components/StoryDashboard';
import { useIndexStatusBanner } from '../hooks/use-index-status-banner';

export async function storyDashboardLoader({
  params,
}: LoaderFunctionArgs): Promise<EnvelopedResult<StoryOverview>> {
  const worldSlug = params.slug;
  const storySlug = params.storySlug;

  if (!worldSlug || !storySlug) {
    throw new Error('World slug and story slug are required to load the story dashboard.');
  }

  return getStoryOverview(worldSlug, storySlug);
}

export function StoryDashboardRoute(): JSX.Element {
  const { envelope, payload: overview } = useLoaderData() as EnvelopedResult<StoryOverview>;
  const indexStatusBanner = useIndexStatusBanner(envelope);

  return <StoryDashboard overview={overview} indexStatusBanner={indexStatusBanner} />;
}
