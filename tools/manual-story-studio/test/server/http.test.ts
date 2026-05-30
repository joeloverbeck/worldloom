import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../src/server/http.js";

function createFixtureRepoRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-http-"));
}

function makeWorld(repoRoot: string, worldSlug: string): void {
  const worldRoot = path.join(repoRoot, "worlds", worldSlug);
  mkdirSync(worldRoot, { recursive: true });
  writeFileSync(path.join(worldRoot, "WORLD_KERNEL.md"), `# ${worldSlug}\n`);
}

test("createServer boots without throwing on a valid repo root", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    const server = await createServer({ repoRoot });
    await server.close();
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET /api/worlds returns 200 with a worlds array", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "alpha-world");
    makeWorld(repoRoot, "beta-world");

    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({ method: "GET", url: "/api/worlds" });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { worlds: Array<{ worldSlug: string }> };
      assert.equal(Array.isArray(body.worlds), true);
      assert.equal(body.worlds.length, 2);
      assert.deepEqual(
        body.worlds.map((w) => w.worldSlug),
        ["alpha-world", "beta-world"],
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET /api/worlds returns { worlds: [] } when worlds/ directory is absent", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({ method: "GET", url: "/api/worlds" });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { worlds: unknown[] };
      assert.deepEqual(body, { worlds: [] });
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("attempting to register a POST route outside wrapRouterWritable throws", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    const server = await createServer({ repoRoot });
    try {
      assert.throws(
        () => server.post("/api/illegal", () => ({})),
        /write-scope fence violation: POST \/api\/illegal/,
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("static-serve is a no-op when web/dist/index.html is absent (server still boots)", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({ method: "GET", url: "/api/worlds" });
      assert.equal(response.statusCode, 200);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
