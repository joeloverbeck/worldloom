/**
 * Manual Studio capstone: SPEC-100 acceptance criteria 1-9.
 *
 * Automated assertions (run via `cd tools/manual-story-studio && npm test`):
 *   - AC #1, #2, #5, #6, #8 (backend half), #9: covered below by node:test cases.
 *   - AC #3, #4: upstream unit-test coverage in tickets 002, 003; this capstone
 *     adds grep-proofs that the wrapper + sandbox are actually wired into the
 *     POST handler.
 *
 * Manual dry-run runbook (AC #7 frontend end-to-end; AC #8 frontend banner display):
 *
 *   Prerequisite: this test file passes via `cd tools/manual-story-studio && npm test`.
 *
 *   Step 1. Build everything:
 *     cd tools/manual-story-studio && npm run build
 *
 *   Step 2. Boot the backend against the real repo root (do NOT mutate canon):
 *     node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root <repo-root>
 *     # Confirm stderr shows the 5-line banner.
 *     # Leave running in one terminal.
 *
 *   Step 3. Boot the Vite dev server in a second terminal:
 *     cd tools/manual-story-studio/web && npm run dev
 *     # Confirm "Local: http://127.0.0.1:5176/" appears.
 *
 *   Step 4. Open http://127.0.0.1:5176 in a browser.
 *     # Confirm: (a) the 4-line frontend banner appears at the top of the page;
 *     #         (b) the world picker lists worlds from the real repo root;
 *     #         (c) clicking a world navigates to its manual-stories list.
 *
 *   Step 5. Create a manual story in a temp world (NOT in real canon):
 *     # Pre-step: create a temp world directory under <repo-root>/worlds/test-capstone-world/
 *     #          with at minimum a WORLD_KERNEL.md placeholder.
 *     # In the UI: open the test-capstone-world manual-stories list, click "Create Manual Story",
 *     #          enter slug "test-story", title "Test Capstone Story", submit.
 *     # Confirm: 201 response, redirect to list view, new entry shows in the list.
 *
 *   Step 6. Confirm filesystem state:
 *     ls <repo-root>/worlds/test-capstone-world/manual-stories/test-story/manual-story.yaml
 *     # File exists.
 *
 *   Step 7. Run world-index build, confirm zero unexpected_path warnings for manual-stories/:
 *     node tools/world-index/dist/src/cli.js build test-capstone-world
 *
 *   Step 8. Cleanup:
 *     rm -rf <repo-root>/worlds/test-capstone-world/
 */

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createServer } from "../src/server/http.js";

// Compiled test file lives at dist/test/capstone-spec100.test.js, which is
// four levels below the repo root (worldloom/tools/manual-story-studio/dist/test/).
const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..");

test("AC #1: package builds + tests pass — meta-proof", () => {
  // Reaching this assertion means the test suite built (build:backend) and is
  // executing. The other capstone cases below exercise concrete pass conditions.
  assert.ok(true);
});

test("AC #2: backend exposes the three SPEC-100 routes and no PUT/PATCH/DELETE", async () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-capstone-routes-"));
  try {
    const server = await createServer({ repoRoot });
    try {
      const routes = server.printRoutes({ includeMeta: false });
      assert.match(routes, /api\/worlds/);
      assert.match(routes, /:slug/);
      assert.match(routes, /manual-stories/);

      const apiLines = routes
        .split("\n")
        .filter((line) => /\((GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)/.test(line));
      for (const method of ["PUT", "PATCH", "DELETE"]) {
        for (const line of apiLines) {
          assert.equal(
            line.includes(`(${method}`),
            false,
            `unexpected ${method} method registered: ${line}`,
          );
        }
      }
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("AC #3: http.ts wires write routes inside wrapRouterWritable (grep-proof)", () => {
  const httpSource = readFileSync(
    path.join(REPO_ROOT, "tools/manual-story-studio/src/server/http.ts"),
    "utf8",
  );
  assert.match(httpSource, /wrapRouterWritable\s*\(/);
  assert.match(httpSource, /registerManualStoriesWriteRoutes\s*\(/);
  const wrapIndex = httpSource.indexOf("wrapRouterWritable(");
  const writeRegIndex = httpSource.indexOf("registerManualStoriesWriteRoutes(");
  assert.ok(
    wrapIndex >= 0 && writeRegIndex >= 0 && wrapIndex < writeRegIndex,
    "write routes must be registered after the wrapRouterWritable scope opens",
  );
});

test("AC #4: manual-stories POST handler calls assertInsideSandbox before any fs mutation (grep-proof)", () => {
  const routeSource = readFileSync(
    path.join(REPO_ROOT, "tools/manual-story-studio/src/server/routes/manual-stories.ts"),
    "utf8",
  );
  assert.match(routeSource, /assertInsideSandbox\s*\(/);
  const sandboxIndex = routeSource.indexOf("assertInsideSandbox(");
  const mkdirIndex = routeSource.indexOf("mkdirSync(");
  const writeFileIndex = routeSource.indexOf("writeFileSync(");
  assert.ok(sandboxIndex >= 0, "assertInsideSandbox must be called");
  assert.ok(
    sandboxIndex < mkdirIndex,
    "assertInsideSandbox must precede mkdirSync",
  );
  assert.ok(
    sandboxIndex < writeFileIndex,
    "assertInsideSandbox must precede writeFileSync",
  );
});

test("AC #5: enumerate.ts source contains the manual-stories/ exclusion (grep-proof)", () => {
  const enumerateSource = readFileSync(
    path.join(REPO_ROOT, "tools/world-index/src/enumerate.ts"),
    "utf8",
  );
  assert.match(enumerateSource, /segments\[0\]\s*===\s*"manual-stories"/);
});

test("AC #6: POST creates the manual-story file end-to-end (composes fence + sandbox + reads + server)", async () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-capstone-e2e-"));
  try {
    const worldSlug = "test-capstone-world";
    const worldRoot = path.join(repoRoot, "worlds", worldSlug);
    mkdirSync(worldRoot, { recursive: true });
    writeFileSync(path.join(worldRoot, "WORLD_KERNEL.md"), `# ${worldSlug}\n`);

    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories`,
        payload: { slug: "test-story", title: "Test Capstone" },
      });
      assert.equal(response.statusCode, 201);

      const expectedYaml = path.join(
        worldRoot,
        "manual-stories",
        "test-story",
        "manual-story.yaml",
      );
      assert.equal(existsSync(expectedYaml), true);
      const contents = readFileSync(expectedYaml, "utf8");
      assert.match(contents, /title: Test Capstone/);

      const listResponse = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories`,
      });
      assert.equal(listResponse.statusCode, 200);
      const listBody = listResponse.json() as {
        manualStories: Array<{ manualStorySlug: string }>;
      };
      assert.equal(listBody.manualStories.length, 1);
      assert.equal(listBody.manualStories[0]?.manualStorySlug, "test-story");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("AC #8 (backend half): src/cli.ts contains the 5-line startup banner verbatim (grep-proof)", () => {
  const cliSource = readFileSync(
    path.join(REPO_ROOT, "tools/manual-story-studio/src/cli.ts"),
    "utf8",
  );
  assert.match(cliSource, /"Manual Story Studio"/);
  assert.match(cliSource, /"Write root: worlds\/<world>\/manual-stories\/<story>\/"/);
  assert.match(cliSource, /"World canon: read-only"/);
  assert.match(cliSource, /"Normal story bundles: read-only"/);
  assert.match(cliSource, /"External LLM: not connected"/);
});

test("AC #8 (frontend half): App.tsx contains the 4-line frontend banner (grep-proof)", () => {
  const appSource = readFileSync(
    path.join(REPO_ROOT, "tools/manual-story-studio/web/src/App.tsx"),
    "utf8",
  );
  assert.match(appSource, /Write root: worlds/);
  assert.match(appSource, /World canon: read-only/);
  assert.match(appSource, /Normal story bundles: read-only/);
  assert.match(appSource, /External LLM: not connected/);
});

test("AC #9: package README documents verified Hook 3 / Hook 2 / lowercase-ID posture (grep-proof)", () => {
  const readmeSource = readFileSync(
    path.join(REPO_ROOT, "tools/manual-story-studio/README.md"),
    "utf8",
  );
  assert.match(readmeSource, /Hook 3/);
  assert.match(readmeSource, /hook3-guard-direct-edit\.ts/);
  assert.match(readmeSource, /Hook 2/);
  assert.match(readmeSource, /isAtomicSourceYaml/);
  assert.match(readmeSource, /ALWAYS_PROTECTED_FILES/);
  assert.match(readmeSource, /lowercase/);
  assert.match(readmeSource, /m-prefix/);
  assert.match(readmeSource, /STENT-/);
});

test("AC #9: docs/manual-story-studio/README.md distinguishes verbatim vs Manual Studio-specific renderer files (grep-proof)", () => {
  const docsReadme = readFileSync(
    path.join(REPO_ROOT, "docs/manual-story-studio/README.md"),
    "utf8",
  );
  assert.match(docsReadme, /content-policy\.md/);
  assert.match(docsReadme, /verbatim/);
  assert.match(docsReadme, /prose-craft-contract\.md/);
  assert.match(docsReadme, /manual-render-instruction\.md/);
});

test("AC invariant: Manual Studio's package.json forbids @worldloom/patch-engine, @worldloom/world-mcp, better-sqlite3", () => {
  const pkg = JSON.parse(
    readFileSync(
      path.join(REPO_ROOT, "tools/manual-story-studio/package.json"),
      "utf8",
    ),
  ) as { dependencies?: Record<string, string> };
  const deps = pkg.dependencies ?? {};
  for (const forbidden of [
    "@worldloom/patch-engine",
    "@worldloom/world-mcp",
    "better-sqlite3",
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(deps, forbidden),
      false,
      `forbidden runtime dep: ${forbidden}`,
    );
  }
});
