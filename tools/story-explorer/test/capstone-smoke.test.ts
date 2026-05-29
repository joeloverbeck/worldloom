import assert from "node:assert/strict";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { sha256Hex } from "@worldloom/world-index/hash/content";

import { createServer } from "../src/server/http.js";
import { seedSceneFirstFixture } from "./scene-first-fixture.js";

interface Enveloped<T> {
  _envelope?: {
    requestId?: string;
    serverVersion?: string;
    worldIndexStatus?: { kind?: string } | null;
  };
  data?: T;
}

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(entryPath);
      }
      return entryPath.endsWith(".yaml") ? [entryPath] : [];
    })
    .sort();
}

function sourceHashes(sourceRoot: string): Map<string, string> {
  return new Map(
    sourceFiles(sourceRoot).map((sourcePath) => [
      path.relative(sourceRoot, sourcePath),
      sha256Hex(readFileSync(sourcePath, "utf8")),
    ]),
  );
}

function assertEnvelope<T>(body: string, worldStatusKind: string | null): Enveloped<T> {
  const parsed = JSON.parse(body) as Enveloped<T>;
  assert.equal(typeof parsed._envelope?.requestId, "string");
  assert.equal(parsed._envelope?.serverVersion, "0.1.0");
  if (worldStatusKind === null) {
    assert.equal(parsed._envelope?.worldIndexStatus, null);
  } else {
    assert.equal(parsed._envelope?.worldIndexStatus?.kind, worldStatusKind);
  }
  return parsed;
}

test("capstone smoke covers every SPEC-96 scene-first route family without mutating fixture source", async () => {
  const fixture = seedSceneFirstFixture();
  const { expected } = fixture;
  const sourceRoot = path.join(fixture.storyRoot, "_source");
  const beforeHashes = sourceHashes(sourceRoot);
  const canonicalRedBunny = path.resolve(process.cwd(), "..", "..", "worlds", "erotica-world", "stories", "red-bunny");
  assert.notEqual(path.resolve(fixture.storyRoot), canonicalRedBunny);

  const base = `/api/worlds/${expected.worldSlug}/stories/${expected.storySlug}`;
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    // --- Shared infrastructure routes -------------------------------------
    const health = await server.inject({ method: "GET", url: "/api/health" });
    assert.equal(health.statusCode, 200);
    assert.equal(assertEnvelope<{ ok?: boolean }>(health.body, null).data?.ok, true);

    const worlds = await server.inject({ method: "GET", url: "/api/worlds" });
    assert.equal(worlds.statusCode, 200);
    const worldsBody = assertEnvelope<Array<{ worldSlug?: string; indexStatus?: { kind?: string } }>>(worlds.body, null);
    assert.equal(worldsBody.data?.[0]?.worldSlug, expected.worldSlug);
    assert.equal(worldsBody.data?.[0]?.indexStatus?.kind, "fresh");

    const stories = await server.inject({ method: "GET", url: `/api/worlds/${expected.worldSlug}/stories` });
    assert.equal(stories.statusCode, 200);
    const storiesBody = assertEnvelope<Array<{ storySlug?: string; pageCount?: number }>>(stories.body, "fresh");
    assert.equal(storiesBody.data?.[0]?.storySlug, expected.storySlug);
    assert.equal(storiesBody.data?.[0]?.pageCount, expected.pageCount);

    // --- Scene-first surface (AC1) ----------------------------------------
    const overview = await server.inject({ method: "GET", url: `${base}/overview` });
    assert.equal(overview.statusCode, 200);
    const overviewBody = assertEnvelope<{
      pageCount?: number;
      choiceCount?: number;
      branchCount?: number;
      degradedDirectRead?: boolean;
      sceneCoverageCounts?: {
        status?: string;
        activeSceneCount?: number;
        supersededSceneCount?: number;
        totalSceneCount?: number;
      };
      unscenedRunCounts?: { status?: string; runCount?: number; pageCount?: number };
      branches?: Array<{ branchId?: string; latestScene?: { publicationState?: string } | null }>;
    }>(overview.body, "fresh");
    assert.equal(overviewBody.data?.degradedDirectRead, false);
    assert.equal(overviewBody.data?.pageCount, expected.pageCount);
    assert.equal(overviewBody.data?.choiceCount, expected.choiceCount);
    assert.equal(overviewBody.data?.branchCount, expected.branchCount);
    assert.deepEqual(overviewBody.data?.sceneCoverageCounts, {
      status: "available",
      activeSceneCount: expected.activeSceneCount,
      supersededSceneCount: expected.supersededSceneCount,
      totalSceneCount: expected.totalSceneCount,
    });
    assert.deepEqual(overviewBody.data?.unscenedRunCounts, {
      status: "available",
      runCount: expected.unscenedRunCount,
      pageCount: expected.unscenedPageCount,
    });
    assert.deepEqual(
      overviewBody.data?.branches?.map((branch) => branch.branchId),
      expected.branchIds,
    );

    const timeline = await server.inject({ method: "GET", url: `${base}/timeline?branchId=BR-1&focus=PG-2` });
    assert.equal(timeline.statusCode, 200);
    const timelineBody = assertEnvelope<{
      branchId?: string;
      degradedDirectRead?: boolean;
      segments?: Array<{ kind?: string; sceneId?: string; publicationState?: string }>;
    }>(timeline.body, "fresh");
    assert.equal(timelineBody.data?.branchId, "BR-1");
    assert.equal(timelineBody.data?.degradedDirectRead, false);
    const sceneSegment = timelineBody.data?.segments?.find((segment) => segment.kind === "scene_segment");
    assert.equal(sceneSegment?.sceneId, "SCN-1");
    assert.equal(sceneSegment?.publicationState, "attached:PASS");

    const scenes = await server.inject({ method: "GET", url: `${base}/scenes` });
    assert.equal(scenes.statusCode, 200);
    const scenesBody = assertEnvelope<{
      degradedDirectRead?: boolean;
      scenes?: Array<{ sceneId?: string; publicationState?: string }>;
    }>(scenes.body, "fresh");
    assert.equal(scenesBody.data?.degradedDirectRead, false);
    assert.equal(scenesBody.data?.scenes?.length, expected.totalSceneCount);

    // Filters narrow the list to the prose-backed, receipt-passing scene only.
    const filteredScenes = await server.inject({
      method: "GET",
      url: `${base}/scenes?coverage=active&hasProse=true&receiptVerdict=PASS`,
    });
    assert.equal(filteredScenes.statusCode, 200);
    const filteredBody = assertEnvelope<{ scenes?: Array<{ sceneId?: string }> }>(filteredScenes.body, "fresh");
    assert.deepEqual(
      filteredBody.data?.scenes?.map((scene) => scene.sceneId),
      [expected.proseBackedSceneId],
    );

    const sceneDetail = await server.inject({ method: "GET", url: `${base}/scenes/${expected.proseBackedSceneId}` });
    assert.equal(sceneDetail.statusCode, 200);
    const sceneDetailBody = assertEnvelope<{
      sceneRecord?: { id?: string };
      pageIds?: string[];
      artifactLinks?: { plan?: string; prose?: string; receipt?: string };
    }>(sceneDetail.body, "fresh");
    assert.equal(sceneDetailBody.data?.sceneRecord?.id, expected.proseBackedSceneId);
    assert.deepEqual(sceneDetailBody.data?.pageIds, ["PG-1", "PG-2"]);
    assert.equal(sceneDetailBody.data?.artifactLinks?.prose, `${base}/scenes/${expected.proseBackedSceneId}/prose`);

    const scenePlan = await server.inject({ method: "GET", url: `${base}/scenes/${expected.proseBackedSceneId}/plan` });
    assert.equal(scenePlan.statusCode, 200);
    assert.equal(assertEnvelope<{ kind?: string; body?: string }>(scenePlan.body, "fresh").data?.body, "Scene plan body\n");

    const sceneProse = await server.inject({ method: "GET", url: `${base}/scenes/${expected.proseBackedSceneId}/prose` });
    assert.equal(sceneProse.statusCode, 200);
    assert.equal(
      assertEnvelope<{ kind?: string; body?: string }>(sceneProse.body, "fresh").data?.body,
      "Rendered scene prose.\n",
    );

    const sceneReceipt = await server.inject({ method: "GET", url: `${base}/scenes/${expected.proseBackedSceneId}/receipt` });
    assert.equal(sceneReceipt.statusCode, 200);
    assert.equal(
      assertEnvelope<{ body?: { verdict?: string } }>(sceneReceipt.body, "fresh").data?.body?.verdict,
      "PASS",
    );

    const unscened = await server.inject({ method: "GET", url: `${base}/unscened-ranges?branchId=BR-1` });
    assert.equal(unscened.statusCode, 200);
    const unscenedBody = assertEnvelope<{
      branchId?: string;
      degradedDirectRead?: boolean;
      ranges?: Array<{ startPg?: string; endPg?: string; pageIds?: string[]; count?: number }>;
    }>(unscened.body, "fresh");
    assert.equal(unscenedBody.data?.branchId, "BR-1");
    assert.equal(unscenedBody.data?.degradedDirectRead, false);
    assert.equal(unscenedBody.data?.ranges?.length, expected.unscenedRunCount);
    assert.deepEqual(unscenedBody.data?.ranges?.[0]?.pageIds, ["PG-3"]);

    const xray = await server.inject({ method: "GET", url: `${base}/state-ticks/PG-2/xray` });
    assert.equal(xray.statusCode, 200);
    const xrayBody = assertEnvelope<{
      pageId?: string;
      degradedDirectRead?: boolean;
      container?: { kind?: string; sceneId?: string };
    }>(xray.body, "fresh");
    assert.equal(xrayBody.data?.pageId, "PG-2");
    assert.equal(xrayBody.data?.degradedDirectRead, false);
    assert.equal(xrayBody.data?.container?.kind, "scene");
    assert.equal(xrayBody.data?.container?.sceneId, "SCN-1");

    // --- Retained technical lookup surfaces (D6) --------------------------
    const record = await server.inject({ method: "GET", url: `${base}/records/PG-1` });
    assert.equal(record.statusCode, 200);
    const recordBody = assertEnvelope<{ record?: { id?: string }; recordCard?: { summaryLine?: string } }>(record.body, "fresh");
    assert.equal(recordBody.data?.record?.id, "PG-1");
    assert.equal(recordBody.data?.recordCard?.summaryLine, "PG-1");

    const rawRecord = await server.inject({ method: "GET", url: `${base}/records/PG-1/raw` });
    assert.equal(rawRecord.statusCode, 200);
    assert.match(assertEnvelope<{ body?: string }>(rawRecord.body, "fresh").data?.body ?? "", /id: PG-1/);

    const provenance = await server.inject({ method: "GET", url: `${base}/provenance/STENT-1` });
    assert.equal(provenance.statusCode, 200);
    const provenanceBody = assertEnvelope<{ creatingSeId?: string; modifyingSeIds?: string[]; evidenceRecords?: string[] }>(
      provenance.body,
      "fresh",
    );
    assert.equal(provenanceBody.data?.creatingSeId, "SE-1");
    assert.deepEqual(provenanceBody.data?.modifyingSeIds, ["SE-2"]);
    assert.deepEqual(provenanceBody.data?.evidenceRecords, ["SE-1"]);

    // --- Retained sketch placeholders (still resolve under the envelope) --
    const search = await server.inject({ method: "GET", url: `${base}/search?q=test` });
    assert.equal(search.statusCode, 200);
    assert.equal(assertEnvelope<{ kind?: string }>(search.body, "fresh").data?.kind, "not_implemented");

    const branchMap = await server.inject({ method: "GET", url: `${base}/branch-map?focus=PG-1` });
    assert.equal(branchMap.statusCode, 200);
    assert.equal(assertEnvelope<{ spec?: string }>(branchMap.body, "fresh").data?.spec, "SPEC-90");

    // --- Invariant: the fixture source tree is never mutated --------------
    assert.deepEqual(sourceHashes(sourceRoot), beforeHashes);
    assert.notEqual(path.resolve(fixture.storyRoot), canonicalRedBunny);
  } finally {
    await server.close();
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});
