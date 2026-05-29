import { Link, useLoaderData, useSearchParams, type LoaderFunctionArgs } from 'react-router-dom';

import type {
  EnvelopedResult,
  ListScenesQuery,
  SceneList,
  ScenePublicationState,
  SceneSummary,
} from '../api/client';
import { listScenes } from '../api/client';
import { useIndexStatusBannerFromStatus } from '../hooks/use-index-status-banner';

interface SceneListRouteResult {
  scenes: EnvelopedResult<SceneList>;
  worldSlug: string;
  storySlug: string;
}

export async function sceneListLoader({ params, request }: LoaderFunctionArgs): Promise<SceneListRouteResult> {
  const worldSlug = params.slug;
  const storySlug = params.storySlug;

  if (!worldSlug || !storySlug) {
    throw new Error('World slug and story slug are required to load scenes.');
  }

  // The filter controls write URL query state; the loader maps it 1:1 onto
  // SPEC-96's /scenes query params (branchId / hasProse / receiptVerdict /
  // coverage). No client-side filtering — the backend owns filter semantics.
  // The `branch` shorthand mirrors the timeline/dashboard convention and maps
  // to SPEC-96's `branchId`.
  const url = new URL(request.url);
  const query: ListScenesQuery = {};

  const branch = url.searchParams.get('branch');
  if (branch) {
    query.branchId = branch;
  }

  const hasProse = url.searchParams.get('hasProse');
  if (hasProse === 'true') {
    query.hasProse = true;
  } else if (hasProse === 'false') {
    query.hasProse = false;
  }

  const receiptVerdict = url.searchParams.get('receiptVerdict');
  if (receiptVerdict === 'PASS' || receiptVerdict === 'WARN' || receiptVerdict === 'FAIL') {
    query.receiptVerdict = receiptVerdict;
  }

  const coverage = url.searchParams.get('coverage');
  if (coverage === 'active' || coverage === 'superseded') {
    query.coverage = coverage;
  }

  const scenes = await listScenes(worldSlug, storySlug, query);

  return { scenes, worldSlug, storySlug };
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

function artifactAvailabilityLabel(scene: SceneSummary): string {
  const present: string[] = [];
  if (scene.artifactAvailability.hasPlan) {
    present.push('plan');
  }
  if (scene.artifactAvailability.hasProse) {
    present.push('prose');
  }
  if (scene.artifactAvailability.hasReceipt) {
    present.push('receipt');
  }
  return present.length === 0 ? 'no artifacts' : present.join(' · ');
}

function SceneRow({ scene, worldSlug, storySlug }: { scene: SceneSummary; worldSlug: string; storySlug: string }): JSX.Element {
  const detailHref = `/worlds/${encodeURIComponent(worldSlug)}/stories/${encodeURIComponent(storySlug)}/scenes/${encodeURIComponent(scene.sceneId)}`;
  const range = scene.startPageId === null || scene.endPageId === null ? 'no pages' : `${scene.startPageId} → ${scene.endPageId}`;

  return (
    <li>
      <Link className="scene-row" to={detailHref}>
        <span className="scene-row__topline">
          <span className="scene-row__title">{scene.sceneId}</span>
          <PublicationChip state={scene.publicationState} />
        </span>
        <span className="scene-row__meta">
          <span>{scene.branchId}</span>
          <span>{range}</span>
          <span>{scene.coverageStatus}</span>
          <span>{artifactAvailabilityLabel(scene)}</span>
        </span>
      </Link>
    </li>
  );
}

function EmptySceneList(): JSX.Element {
  return (
    <section className="empty-state" aria-labelledby="scenes-empty-title">
      <h2 id="scenes-empty-title">No scenes match these filters.</h2>
      <p>Adjust the filters above, or plan a scene with the branching-story scene-plan skill.</p>
    </section>
  );
}

export function ScenesRoute(): JSX.Element {
  const {
    scenes: { payload: sceneList },
    worldSlug,
    storySlug,
  } = useLoaderData() as SceneListRouteResult;
  const [searchParams, setSearchParams] = useSearchParams();
  const banner = useIndexStatusBannerFromStatus(sceneList.indexStatus);

  function updateFilter(key: string, value: string): void {
    const next = new URLSearchParams(searchParams);
    if (value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  }

  return (
    <main className="app-shell scenes-route" aria-labelledby="scenes-title">
      <header className="route-header">
        <p className="route-kicker">
          {worldSlug} · {storySlug}
        </p>
        <h1 id="scenes-title">Scenes</h1>
      </header>

      {banner}

      <form className="scenes-route__filters" aria-label="Scene filters" onSubmit={(event) => event.preventDefault()}>
        <div className="scenes-route__filter">
          <label htmlFor="scenes-filter-branch">Branch</label>
          <input
            id="scenes-filter-branch"
            type="text"
            placeholder="All branches"
            value={searchParams.get('branch') ?? ''}
            onChange={(event) => updateFilter('branch', event.target.value)}
          />
        </div>
        <div className="scenes-route__filter">
          <label htmlFor="scenes-filter-has-prose">Prose</label>
          <select
            id="scenes-filter-has-prose"
            value={searchParams.get('hasProse') ?? ''}
            onChange={(event) => updateFilter('hasProse', event.target.value)}
          >
            <option value="">Any</option>
            <option value="true">Has prose</option>
            <option value="false">No prose</option>
          </select>
        </div>
        <div className="scenes-route__filter">
          <label htmlFor="scenes-filter-receipt-verdict">Receipt verdict</label>
          <select
            id="scenes-filter-receipt-verdict"
            value={searchParams.get('receiptVerdict') ?? ''}
            onChange={(event) => updateFilter('receiptVerdict', event.target.value)}
          >
            <option value="">Any</option>
            <option value="PASS">PASS</option>
            <option value="WARN">WARN</option>
            <option value="FAIL">FAIL</option>
          </select>
        </div>
        <div className="scenes-route__filter">
          <label htmlFor="scenes-filter-coverage">Coverage</label>
          <select
            id="scenes-filter-coverage"
            value={searchParams.get('coverage') ?? ''}
            onChange={(event) => updateFilter('coverage', event.target.value)}
          >
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>
      </form>

      {sceneList.scenes.length === 0 ? (
        <EmptySceneList />
      ) : (
        <ul className="scene-list" aria-label="Scenes">
          {sceneList.scenes.map((scene) => (
            <SceneRow key={scene.sceneId} scene={scene} worldSlug={worldSlug} storySlug={storySlug} />
          ))}
        </ul>
      )}
    </main>
  );
}
