/**
 * SPEC-89 Capstone Smoke - Manual Runbook
 *
 * Before declaring SPEC-89 landed, manually verify the following in dev mode
 * against a real story bundle, such as worlds/erotica-world/stories/red-bunny/
 * when present in your checkout, or a temp-seeded equivalent:
 *
 * 1. Open a reading page; the State X-Ray section appears below the choice list.
 * 2. Click each of the four tabs: Current State, What Changed Here, Plan & Prose,
 *    and Validation & Integrity. Each tab renders its prescribed content.
 * 3. In Current State, expand a record card; the expanded view shows fields,
 *    provenance trail, and a raw-view button.
 * 4. In Current State, click a record-ID chip pointing to another active record;
 *    the X-Ray scrolls to that card.
 * 5. In Current State, click a record-ID chip pointing to a not-active record;
 *    a right-side peek panel opens.
 * 6. In Validation & Integrity, observe a broken-reference chip after intentionally
 *    introducing one in a disposable copy.
 * 7. In Current State, expand a STCHAR card; the body splits into section disclosures.
 * 8. Resize the viewport: desktop shows the sticky right rail and mobile shows the
 *    inline summary bar.
 * 9. Use ArrowRight/ArrowLeft on the tab list; focus and aria-selected cycle through tabs.
 * 10. Set prefers-reduced-motion to reduce; expand/collapse animations are disabled.
 *
 * Steps 1-10 are manual checklist items. The automated assertions below cover
 * built bundle membership, source maps, read-only API envelope behavior, and the
 * backend fallback when the web bundle is absent.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createServer } from "../src/server/http.js";

function packageRoot(): string {
  return path.resolve(import.meta.dirname, "..", "..");
}

function repoRoot(): string {
  return path.resolve(packageRoot(), "..", "..");
}

function webDistPath(): string {
  return path.join(packageRoot(), "web", "dist");
}

function assetFiles(extension: string): string[] {
  const assetsPath = path.join(webDistPath(), "assets");
  return readdirSync(assetsPath)
    .filter((entry) => entry.endsWith(extension))
    .map((entry) => path.join(assetsPath, entry))
    .sort();
}

function readBuiltSourceMap(): { sources?: string[] } {
  const sourceMaps = assetFiles(".js.map");
  assert.equal(sourceMaps.length, 1);
  return JSON.parse(readFileSync(sourceMaps[0]!, "utf8")) as { sources?: string[] };
}

function createTempRepo(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "story-explorer-spec89-capstone-"));
  mkdirSync(path.join(root, ".git"));
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  return root;
}

function createTempRepoWithWebDist(): string {
  const root = createTempRepo();
  const dist = path.join(root, "tools", "story-explorer", "web", "dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(
    path.join(dist, "index.html"),
    "<!doctype html><html><head><title>Worldloom Story Explorer</title></head><body><div id=\"root\"></div></body></html>\n",
    "utf8",
  );
  return root;
}

test("SPEC-89 capstone built web bundle includes the State X-Ray surface", () => {
  const indexHtml = path.join(webDistPath(), "index.html");
  assert.equal(existsSync(indexHtml), true);
  assert.equal(assetFiles(".js").length, 1);
  assert.equal(assetFiles(".css").length, 1);

  // SPEC-97 rebound the x-ray to the scene-first StateTickXray payload: the
  // page-level "Plan & Prose" tab was removed and the StickyRail/MobileSummaryBar
  // are no longer reachable. The proof now asserts the surviving x-ray sources
  // plus the scene-first StateTickDrawer entry point ship in the bundle.
  const sourceMap = readBuiltSourceMap();
  assert.deepEqual(
    [
      "../../src/components/StateTickDrawer.tsx",
      "../../src/components/xray/XRayPanel.tsx",
      "../../src/components/xray/XRayTabs.tsx",
      "../../src/components/xray/RecordCardCompact.tsx",
      "../../src/components/xray/RecordCardExpanded.tsx",
      "../../src/components/xray/tabs/CurrentStateTab.tsx",
      "../../src/components/xray/tabs/WhatChangedHereTab.tsx",
      "../../src/components/xray/tabs/ValidationIntegrityTab.tsx",
    ].filter((source) => !(sourceMap.sources ?? []).includes(source)),
    [],
  );
});

test("SPEC-89 capstone static serving keeps API routes enveloped", async () => {
  const server = await createServer({ repoRoot: repoRoot() });

  try {
    const shell = await server.inject({ method: "GET", url: "/" });
    assert.equal(shell.statusCode, 200);
    assert.match(shell.headers["content-type"]?.toString() ?? "", /text\/html/);
    assert.match(shell.body, /Worldloom Story Explorer/);

    const health = await server.inject({ method: "GET", url: "/api/health" });
    const healthBody = JSON.parse(health.body) as {
      _envelope?: { requestId?: string; serverVersion?: string; worldIndexStatus?: unknown };
      data?: { ok?: boolean; version?: string };
    };

    assert.equal(health.statusCode, 200);
    assert.equal(typeof healthBody._envelope?.requestId, "string");
    assert.equal(healthBody._envelope?.serverVersion, "0.1.0");
    assert.equal(healthBody._envelope?.worldIndexStatus, null);
    assert.equal(healthBody.data?.ok, true);
    assert.equal(healthBody.data?.version, "0.1.0");
  } finally {
    await server.close();
  }
});

test("SPEC-89 capstone backend remains usable when web/dist is absent", async () => {
  const server = await createServer({ repoRoot: createTempRepo() });

  try {
    const shell = await server.inject({ method: "GET", url: "/" });
    assert.equal(shell.statusCode, 404);

    const health = await server.inject({ method: "GET", url: "/api/health" });
    assert.equal(health.statusCode, 200);
  } finally {
    await server.close();
  }
});

test("SPEC-89 capstone synthetic static bundle can be served from a disposable repo", async () => {
  const server = await createServer({ repoRoot: createTempRepoWithWebDist() });

  try {
    const shell = await server.inject({ method: "GET", url: "/" });
    assert.equal(shell.statusCode, 200);
    assert.match(shell.body, /<div id="root"><\/div>/);
  } finally {
    await server.close();
  }
});
