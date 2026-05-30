import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../src/server/http.js";

function createFixtureRepoRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-routes-"));
}

function makeWorld(repoRoot: string, worldSlug: string): void {
  const worldRoot = path.join(repoRoot, "worlds", worldSlug);
  mkdirSync(worldRoot, { recursive: true });
  writeFileSync(path.join(worldRoot, "WORLD_KERNEL.md"), `# ${worldSlug}\n`);
}

test("POST /api/worlds/:slug/manual-stories with valid body returns 201 and creates the file", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/worlds/test-world/manual-stories",
        payload: { slug: "test-story", title: "Test Story" },
      });

      assert.equal(response.statusCode, 201);
      const body = response.json() as {
        worldSlug: string;
        manualStorySlug: string;
        title: string;
      };
      assert.equal(body.manualStorySlug, "test-story");
      assert.equal(body.title, "Test Story");

      const yamlPath = path.join(
        repoRoot,
        "worlds",
        "test-world",
        "manual-stories",
        "test-story",
        "manual-story.yaml",
      );
      assert.equal(existsSync(yamlPath), true);
      const contents = readFileSync(yamlPath, "utf8");
      assert.match(contents, /title: Test Story/);
      assert.match(contents, /world_slug: test-world/);
      assert.match(contents, /manual_story_slug: test-story/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST with missing slug returns 400", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/worlds/test-world/manual-stories",
        payload: { title: "Test" },
      });
      assert.equal(response.statusCode, 400);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST with malformed slug returns 400 (sandbox slug validation)", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/worlds/test-world/manual-stories",
        payload: { slug: "Slug With Spaces", title: "Test" },
      });
      assert.equal(response.statusCode, 400);
      const body = response.json() as { error: string; message: string };
      assert.equal(body.error, "invalid_slug");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST to an existing manual-story slug returns 409", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const server = await createServer({ repoRoot });
    try {
      const first = await server.inject({
        method: "POST",
        url: "/api/worlds/test-world/manual-stories",
        payload: { slug: "test-story", title: "First" },
      });
      assert.equal(first.statusCode, 201);

      const second = await server.inject({
        method: "POST",
        url: "/api/worlds/test-world/manual-stories",
        payload: { slug: "test-story", title: "Duplicate" },
      });
      assert.equal(second.statusCode, 409);
      const body = second.json() as { error: string };
      assert.equal(body.error, "already_exists");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET /api/worlds/:slug/manual-stories returns populated list after POSTs", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "test-world");
    const server = await createServer({ repoRoot });
    try {
      await server.inject({
        method: "POST",
        url: "/api/worlds/test-world/manual-stories",
        payload: { slug: "story-a", title: "Story A" },
      });
      await server.inject({
        method: "POST",
        url: "/api/worlds/test-world/manual-stories",
        payload: { slug: "story-b", title: "Story B" },
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/worlds/test-world/manual-stories",
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        manualStories: Array<{ manualStorySlug: string; title: string | null }>;
      };
      assert.equal(body.manualStories.length, 2);
      const slugs = body.manualStories.map((m) => m.manualStorySlug).sort();
      assert.deepEqual(slugs, ["story-a", "story-b"]);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET against a world with no manual-stories/ directory returns { manualStories: [] }", async () => {
  const repoRoot = createFixtureRepoRoot();
  try {
    makeWorld(repoRoot, "empty-world");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/worlds/empty-world/manual-stories",
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { manualStories: unknown[] };
      assert.deepEqual(body, { manualStories: [] });
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
