import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { test } from "node:test";

import { createServer } from "../src/server/http.js";
import { seedMissingIndexFixture, seedSceneFirstFixture } from "./scene-first-fixture.js";

// SPEC-96 §7 acceptance matrix. One assertion block per AC; AC6 is the whole
// suite passing under `npm run test:backend`. Counts/values are re-enumerated
// from the fixture seed (see scene-first-fixture.ts), never hardcoded here.

interface Enveloped<T> {
  _envelope?: { requestId?: string; serverVersion?: string; worldIndexStatus?: { kind?: string } | null };
  data?: T;
}

// The SPEC-95 presence-based publication indicator value set (AC3). No 8-state
// machine, no hash-derived freshness state.
const PUBLICATION_STATES = new Set([
  "planned",
  "prose-present",
  "attached:PASS",
  "attached:WARN",
  "attached:FAIL",
  "superseded",
]);

// The exact, presence-based shape of a scene summary — used to prove no
// hash/freshness/8-state field has leaked onto the surface (AC3).
const SCENE_SUMMARY_KEYS = [
  "artifactAvailability",
  "branchId",
  "coverageStatus",
  "endPageId",
  "pageIds",
  "publicationState",
  "sceneId",
  "startPageId",
].sort((left, right) => left.localeCompare(right));

function parse<T>(body: string): Enveloped<T> {
  return JSON.parse(body) as Enveloped<T>;
}

test("AC1: every scene-first route resolves with the index-status envelope", async () => {
  const fixture = seedSceneFirstFixture();
  const base = `/api/worlds/${fixture.expected.worldSlug}/stories/${fixture.expected.storySlug}`;
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const routes = [
      `${base}/overview`,
      `${base}/timeline?branchId=BR-1`,
      `${base}/scenes`,
      `${base}/scenes/${fixture.expected.proseBackedSceneId}`,
      `${base}/scenes/${fixture.expected.proseBackedSceneId}/plan`,
      `${base}/scenes/${fixture.expected.proseBackedSceneId}/prose`,
      `${base}/scenes/${fixture.expected.proseBackedSceneId}/receipt`,
      `${base}/unscened-ranges?branchId=BR-1`,
      `${base}/state-ticks/PG-2/xray`,
    ];

    for (const url of routes) {
      const response = await server.inject({ method: "GET", url });
      assert.equal(response.statusCode, 200, `${url} should resolve`);
      const body = parse<unknown>(response.body);
      assert.equal(typeof body._envelope?.requestId, "string", `${url} should carry a requestId`);
      assert.equal(body._envelope?.serverVersion, "0.1.0", `${url} should carry the server version`);
      assert.equal(body._envelope?.worldIndexStatus?.kind, "fresh", `${url} should carry the world index status`);
    }
  } finally {
    await server.close();
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC2: removed page-first routes are absent (404)", async () => {
  const fixture = seedSceneFirstFixture();
  const base = `/api/worlds/${fixture.expected.worldSlug}/stories/${fixture.expected.storySlug}`;
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const removedRoutes = [
      `${base}/pages?list=1`,
      `${base}/pages/PG-1`,
      `${base}/prose/PG-1`,
      `${base}/page-plans/PG-1`,
      `${base}/prose-receipts/PG-1`,
    ];

    for (const url of removedRoutes) {
      const response = await server.inject({ method: "GET", url });
      assert.equal(response.statusCode, 404, `${url} must be removed`);
    }
  } finally {
    await server.close();
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC3: scene publication state is the presence-based indicator with no hash/8-state field", async () => {
  const fixture = seedSceneFirstFixture();
  const base = `/api/worlds/${fixture.expected.worldSlug}/stories/${fixture.expected.storySlug}`;
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const response = await server.inject({ method: "GET", url: `${base}/scenes` });
    assert.equal(response.statusCode, 200);
    const body = parse<{ scenes?: Array<Record<string, unknown>> }>(response.body);
    const scenes = body.data?.scenes ?? [];
    assert.equal(scenes.length, fixture.expected.totalSceneCount);

    const observed = new Set<string>();
    for (const scene of scenes) {
      const state = scene.publicationState;
      assert.equal(typeof state, "string", "each scene exposes a publication state");
      assert.equal(PUBLICATION_STATES.has(state as string), true, `publication state ${String(state)} must be in the value set`);
      observed.add(state as string);
      assert.deepEqual(
        Object.keys(scene).sort((left, right) => left.localeCompare(right)),
        SCENE_SUMMARY_KEYS,
        "scene summary exposes only presence-based fields (no hash/freshness/8-state)",
      );
    }

    // The seed exercises every distinct publication state it declares.
    assert.deepEqual([...observed].sort((left, right) => left.localeCompare(right)), fixture.expected.publicationStates);
  } finally {
    await server.close();
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC4: the x-ray is a technical PG surface, not a reader page route", async () => {
  const fixture = seedSceneFirstFixture();
  const base = `/api/worlds/${fixture.expected.worldSlug}/stories/${fixture.expected.storySlug}`;
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const xray = await server.inject({ method: "GET", url: `${base}/state-ticks/PG-2/xray` });
    assert.equal(xray.statusCode, 200);
    const xrayBody = parse<{ pageId?: string; container?: { kind?: string } }>(xray.body);
    assert.equal(xrayBody.data?.pageId, "PG-2");
    assert.equal(typeof xrayBody.data?.container?.kind, "string");

    // No reader page route stands in for the technical x-ray.
    const readerRoute = await server.inject({ method: "GET", url: `${base}/pages/PG-2` });
    assert.equal(readerRoute.statusCode, 404);
  } finally {
    await server.close();
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC5: a missing index degrades every scene-first route without fabricating coverage", async () => {
  const fixture = seedMissingIndexFixture();
  const base = `/api/worlds/fixture-world/stories/red-bunny`;
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const overview = await server.inject({ method: "GET", url: `${base}/overview` });
    assert.equal(overview.statusCode, 200);
    const overviewBody = parse<{
      degradedDirectRead?: boolean;
      sceneCoverageCounts?: { status?: string; activeSceneCount?: number | null; totalSceneCount?: number | null };
      unscenedRunCounts?: { status?: string; runCount?: number | null };
    }>(overview.body);
    assert.equal(overviewBody._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(overviewBody.data?.degradedDirectRead, true);
    assert.equal(overviewBody.data?.sceneCoverageCounts?.status, "degraded");
    assert.equal(overviewBody.data?.sceneCoverageCounts?.activeSceneCount, null);
    assert.equal(overviewBody.data?.sceneCoverageCounts?.totalSceneCount, null);
    assert.equal(overviewBody.data?.unscenedRunCounts?.status, "degraded");
    assert.equal(overviewBody.data?.unscenedRunCounts?.runCount, null);

    const timeline = await server.inject({ method: "GET", url: `${base}/timeline?branchId=BR-1` });
    assert.equal(timeline.statusCode, 200);
    const timelineBody = parse<{ degradedDirectRead?: boolean; segments?: Array<{ kind?: string }> }>(timeline.body);
    assert.equal(timelineBody._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(timelineBody.data?.degradedDirectRead, true);
    assert.equal(
      timelineBody.data?.segments?.some((segment) => segment.kind === "scene_segment"),
      false,
      "degraded timeline must not fabricate scene segments",
    );

    const scenes = await server.inject({ method: "GET", url: `${base}/scenes` });
    assert.equal(scenes.statusCode, 200);
    const scenesBody = parse<{ degradedDirectRead?: boolean; scenes?: unknown[] }>(scenes.body);
    assert.equal(scenesBody._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(scenesBody.data?.degradedDirectRead, true);
    assert.deepEqual(scenesBody.data?.scenes, []);

    const unscened = await server.inject({ method: "GET", url: `${base}/unscened-ranges?branchId=BR-1` });
    assert.equal(unscened.statusCode, 200);
    const unscenedBody = parse<{ degradedDirectRead?: boolean; ranges?: unknown[] }>(unscened.body);
    assert.equal(unscenedBody._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(unscenedBody.data?.degradedDirectRead, true);
    assert.deepEqual(unscenedBody.data?.ranges, []);

    const xray = await server.inject({ method: "GET", url: `${base}/state-ticks/PG-2/xray` });
    assert.equal(xray.statusCode, 200);
    const xrayBody = parse<{ degradedDirectRead?: boolean; container?: { kind?: string; sceneId?: string | null } }>(xray.body);
    assert.equal(xrayBody._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(xrayBody.data?.degradedDirectRead, true);
    assert.equal(xrayBody.data?.container?.kind, "unknown");
    assert.equal(xrayBody.data?.container?.sceneId, null);
  } finally {
    await server.close();
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});
