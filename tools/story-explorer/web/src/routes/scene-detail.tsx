import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

import type { EnvelopedResult, SceneDetail } from '../api/client';
import { getSceneDetail } from '../api/client';
import { SceneDetailShell } from '../components/SceneDetailShell';

interface SceneDetailRouteResult {
  scene: EnvelopedResult<SceneDetail>;
  worldSlug: string;
  storySlug: string;
}

export async function sceneDetailLoader({ params }: LoaderFunctionArgs): Promise<SceneDetailRouteResult> {
  const worldSlug = params.slug;
  const storySlug = params.storySlug;
  const sceneId = params.sceneId;

  if (!worldSlug || !storySlug || !sceneId) {
    throw new Error('World slug, story slug, and scene id are required to load scene detail.');
  }

  const scene = await getSceneDetail(worldSlug, storySlug, sceneId);

  return { scene, worldSlug, storySlug };
}

export function SceneDetailRoute(): JSX.Element {
  const {
    scene: { payload: scene },
    worldSlug,
    storySlug,
  } = useLoaderData() as SceneDetailRouteResult;

  return <SceneDetailShell scene={scene} worldSlug={worldSlug} storySlug={storySlug} />;
}
