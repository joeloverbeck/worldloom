import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  fetchEnveloped,
  getBranchTimeline,
  getSceneDetail,
  getScenePlan,
  getSceneProse,
  getSceneReceipt,
  getStateTickXray,
  getStory,
  getStoryOverview,
  getUnscenedRanges,
  getWorld,
  listScenes,
  listStories,
  listWorlds,
} from './client';

const envelope = {
  requestId: 'req-1',
  serverVersion: '0.1.0',
  worldIndexStatus: null,
};

function mockJsonResponse(body: unknown, init?: ResponseInit): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchEnveloped', () => {
  it('unwraps the backend envelope data field', async () => {
    mockJsonResponse({ _envelope: envelope, data: [{ worldSlug: 'fixture-world' }] });

    const result = await fetchEnveloped<Array<{ worldSlug: string }>>('/api/worlds');

    expect(result.envelope).toEqual(envelope);
    expect(result.payload).toEqual([{ worldSlug: 'fixture-world' }]);
  });

  it('handles responses without an envelope', async () => {
    mockJsonResponse({ data: { ok: true } });

    const result = await fetchEnveloped<{ ok: boolean }>('/api/health');

    expect(result.envelope).toBeNull();
    expect(result.payload).toEqual({ ok: true });
  });

  it('throws ApiError for non-2xx responses', async () => {
    mockJsonResponse({ error: 'not_found', message: 'Missing page' }, { status: 404 });

    await expect(fetchEnveloped('/api/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      body: { error: 'not_found', message: 'Missing page' },
    } satisfies Partial<ApiError>);
  });
});

describe('route helpers', () => {
  it('constructs world and story picker URLs', async () => {
    mockJsonResponse({ _envelope: envelope, data: null });

    await listWorlds();
    await getWorld('fixture world');
    await listStories('fixture-world');
    await getStory('fixture-world', 'red bunny');

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/worlds', undefined);
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/worlds/fixture%20world', undefined);
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/worlds/fixture-world/stories', undefined);
    expect(fetch).toHaveBeenNthCalledWith(4, '/api/worlds/fixture-world/stories/red%20bunny', undefined);
  });
});

describe('SPEC-96 scene-first route helpers', () => {
  it('getStoryOverview targets the overview route and unwraps the envelope', async () => {
    const overview = { worldSlug: 'fixture-world', storySlug: 'red-bunny' };
    mockJsonResponse({ _envelope: envelope, data: overview });

    const result = await getStoryOverview('fixture-world', 'red-bunny');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/overview', undefined);
    expect(result.envelope).toEqual(envelope);
    expect(result.payload).toEqual(overview);
  });

  it('getBranchTimeline omits unset query params', async () => {
    mockJsonResponse({ _envelope: envelope, data: { branchId: 'BR-1', segments: [] } });

    await getBranchTimeline('fixture-world', 'red-bunny');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/timeline', undefined);
  });

  it('getBranchTimeline serializes branchId and focus when provided', async () => {
    mockJsonResponse({ _envelope: envelope, data: { branchId: 'BR-1', segments: [] } });

    await getBranchTimeline('fixture-world', 'red-bunny', { branchId: 'BR-1', focus: 'PG-3' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/worlds/fixture-world/stories/red-bunny/timeline?branchId=BR-1&focus=PG-3',
      undefined,
    );
  });

  it('listScenes serializes filters including boolean hasProse', async () => {
    mockJsonResponse({ _envelope: envelope, data: { scenes: [] } });

    await listScenes('fixture-world', 'red-bunny', {
      branchId: 'BR-1',
      hasProse: false,
      receiptVerdict: 'PASS',
      coverage: 'active',
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/worlds/fixture-world/stories/red-bunny/scenes?branchId=BR-1&hasProse=false&receiptVerdict=PASS&coverage=active',
      undefined,
    );
  });

  it('listScenes omits all filters when none are provided', async () => {
    mockJsonResponse({ _envelope: envelope, data: { scenes: [] } });

    const result = await listScenes('fixture-world', 'red-bunny');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/scenes', undefined);
    expect(result.payload).toEqual({ scenes: [] });
  });

  it('getSceneDetail targets the scene detail route', async () => {
    mockJsonResponse({ _envelope: envelope, data: { sceneId: 'SCN-2' } });

    await getSceneDetail('fixture-world', 'red-bunny', 'SCN-2');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-2', undefined);
  });

  it('getScenePlan targets the plan artifact route', async () => {
    mockJsonResponse({ _envelope: envelope, data: { sceneId: 'SCN-2', kind: 'plan' } });

    await getScenePlan('fixture-world', 'red-bunny', 'SCN-2');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-2/plan', undefined);
  });

  it('getSceneProse targets the prose artifact route', async () => {
    mockJsonResponse({ _envelope: envelope, data: { sceneId: 'SCN-2', kind: 'prose' } });

    await getSceneProse('fixture-world', 'red-bunny', 'SCN-2');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-2/prose', undefined);
  });

  it('getSceneReceipt targets the receipt artifact route', async () => {
    mockJsonResponse({ _envelope: envelope, data: { sceneId: 'SCN-2', kind: 'receipt' } });

    await getSceneReceipt('fixture-world', 'red-bunny', 'SCN-2');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-2/receipt', undefined);
  });

  it('getUnscenedRanges serializes branchId when provided', async () => {
    mockJsonResponse({ _envelope: envelope, data: { branchId: 'BR-1', ranges: [] } });

    await getUnscenedRanges('fixture-world', 'red-bunny', { branchId: 'BR-1' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/worlds/fixture-world/stories/red-bunny/unscened-ranges?branchId=BR-1',
      undefined,
    );
  });

  it('getUnscenedRanges omits branchId when not provided', async () => {
    mockJsonResponse({ _envelope: envelope, data: { branchId: 'BR-1', ranges: [] } });

    await getUnscenedRanges('fixture-world', 'red-bunny');

    expect(fetch).toHaveBeenCalledWith('/api/worlds/fixture-world/stories/red-bunny/unscened-ranges', undefined);
  });

  it('getStateTickXray targets the xray route and unwraps the envelope', async () => {
    const xray = { pageId: 'PG-5', branchId: 'BR-1' };
    mockJsonResponse({ _envelope: envelope, data: xray });

    const result = await getStateTickXray('fixture-world', 'red-bunny', 'PG-5');

    expect(fetch).toHaveBeenCalledWith(
      '/api/worlds/fixture-world/stories/red-bunny/state-ticks/PG-5/xray',
      undefined,
    );
    expect(result.payload).toEqual(xray);
  });
});
