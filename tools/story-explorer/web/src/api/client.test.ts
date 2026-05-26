import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  fetchEnveloped,
  getLatestPage,
  getPageDetail,
  getProseBody,
  getRootPage,
  getStory,
  getWorld,
  listPages,
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
  it('constructs picker and page URLs', async () => {
    mockJsonResponse({ _envelope: envelope, data: null });

    await listWorlds();
    await getWorld('fixture world');
    await listStories('fixture-world');
    await getStory('fixture-world', 'red bunny');
    await listPages('fixture-world', 'red-bunny');
    await getRootPage('fixture-world', 'red-bunny');
    await getLatestPage('fixture-world', 'red-bunny');
    await getPageDetail('fixture-world', 'red-bunny', 'PG-1');
    await getProseBody('fixture-world', 'red-bunny', 'PG-1');

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/worlds', undefined);
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/worlds/fixture%20world', undefined);
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/worlds/fixture-world/stories', undefined);
    expect(fetch).toHaveBeenNthCalledWith(4, '/api/worlds/fixture-world/stories/red%20bunny', undefined);
    expect(fetch).toHaveBeenNthCalledWith(5, '/api/worlds/fixture-world/stories/red-bunny/pages?list=1', undefined);
    expect(fetch).toHaveBeenNthCalledWith(6, '/api/worlds/fixture-world/stories/red-bunny/pages?root=1', undefined);
    expect(fetch).toHaveBeenNthCalledWith(7, '/api/worlds/fixture-world/stories/red-bunny/pages?latest=1', undefined);
    expect(fetch).toHaveBeenNthCalledWith(8, '/api/worlds/fixture-world/stories/red-bunny/pages/PG-1', undefined);
    expect(fetch).toHaveBeenNthCalledWith(9, '/api/worlds/fixture-world/stories/red-bunny/prose/PG-1', undefined);
  });
});
