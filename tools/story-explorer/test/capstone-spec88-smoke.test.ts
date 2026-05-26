/**
 * SPEC-88 manual dry-run runbook
 *
 * 1. From `tools/story-explorer`, run `npm install` if dependencies are absent.
 * 2. Run `npm run build`; confirm `web/dist/index.html` and `dist/src/cli.js` exist.
 * 3. Start the backend from `tools/story-explorer` with
 *    `node dist/src/cli.js --repo-root ../.. --port 5174`.
 * 4. Request `http://127.0.0.1:5174/`; confirm the Story Explorer HTML shell loads.
 * 5. Request `http://127.0.0.1:5174/api/health`; confirm the JSON envelope reports
 *    `{ ok: true }`.
 * 6. If `worlds/erotica-world/stories/red-bunny/` exists in the checkout, open
 *    `http://127.0.0.1:5174/` in a browser.
 * 7. Click `erotica-world` on the World Picker, then click `red-bunny` on the Story Picker.
 * 8. Open the Page Entry screen and choose the root page (`PG-1`).
 * 9. Confirm the Reading Page renders the page header, breadcrumb, branch chip,
 *    turn index, and integrity chip.
 * 10. Confirm the prose panel renders reader prose and no page plan is substituted
 *     as prose.
 * 11. Confirm navigable choices render below prose when committed child pages exist;
 *     otherwise confirm the terminal/paused continuation card renders.
 * 12. Temporarily move the checkout-local copied world index out of the way only in
 *     a disposable copy; reload and confirm the missing-index banner names the remedy.
 * 13. Tab through the rendered page and confirm focus follows the visible flow.
 * 14. Enable reduced motion at the OS/browser level, reload, and confirm no
 *     motion-only state changes occur.
 * 15. Stop the backend with Ctrl-C.
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
  const root = mkdtempSync(path.join(os.tmpdir(), "story-explorer-spec88-capstone-"));
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

test("SPEC-88 capstone built web bundle exposes the reader surface", () => {
  const indexHtml = path.join(webDistPath(), "index.html");
  assert.equal(existsSync(indexHtml), true);
  assert.match(readFileSync(indexHtml, "utf8"), /<div id="root"><\/div>/);
  assert.equal(assetFiles(".js").length, 1);
  assert.equal(assetFiles(".css").length, 1);

  const sourceMap = readBuiltSourceMap();
  assert.deepEqual(
    [
      "../../src/components/ChoiceCard.tsx",
      "../../src/components/IndexStatusBanner.tsx",
      "../../src/components/ProsePanel.tsx",
      "../../src/components/TerminalCard.tsx",
      "../../src/routes/page-read.tsx",
    ].filter((source) => !(sourceMap.sources ?? []).includes(source)),
    [],
  );
});

test("SPEC-88 capstone static serving coexists with API routes", async () => {
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

test("SPEC-88 capstone backend remains usable when web/dist is absent", async () => {
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

test("SPEC-88 capstone synthetic static bundle can be served from a disposable repo", async () => {
  const server = await createServer({ repoRoot: createTempRepoWithWebDist() });

  try {
    const shell = await server.inject({ method: "GET", url: "/" });
    assert.equal(shell.statusCode, 200);
    assert.match(shell.body, /<div id="root"><\/div>/);
  } finally {
    await server.close();
  }
});
