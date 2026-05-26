import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createServer } from "../src/server/http.js";

function createTempRepo(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-server-"));
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(repoRoot, "worlds"), { recursive: true });
  return repoRoot;
}

function createStory(repoRoot: string, worldSlug = "fixture-world", storySlug = "red-bunny"): void {
  const storyRoot = path.join(repoRoot, "worlds", worldSlug, "stories", storySlug);
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  mkdirSync(path.join(storyRoot, "pages-prose"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(storyRoot, "_source", "pages", "PG-1.yaml"),
    JSON.stringify({
      id: "PG-1",
      story_id: "STORY-1",
      branch_id: "BR-1",
      parent_page_id: null,
      branch_path: ["PG-1"],
      turn_index: 0,
      input: {
        choice_id: null,
        resolved_event_id: null,
      },
      state_snapshot: {
        active_records: {},
        continuation: {
          terminal_status: "open",
        },
      },
      emitted_choices: [],
      validation_trace: {},
    }),
    "utf8",
  );
  writeFileSync(path.join(storyRoot, "pages-prose", "PG-1.md"), "Rendered prose\n", "utf8");
}

test("createServer applies the read-only guard to later route registrations", async () => {
  const server = await createServer({ repoRoot: createTempRepo() });

  try {
    assert.throws(
      () => server.post("/api/write", async () => ({ ok: false })),
      /read-only fence violation: POST \/api\/write/,
    );
  } finally {
    await server.close();
  }
});

test("health route returns the universal response envelope", async () => {
  const server = await createServer({ repoRoot: createTempRepo() });

  try {
    const response = await server.inject({ method: "GET", url: "/api/health" });
    const body = JSON.parse(response.body) as {
      _envelope?: {
        requestId?: string;
        serverVersion?: string;
        worldIndexStatus?: unknown;
      };
      data?: { ok?: boolean; version?: string };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(typeof body._envelope?.requestId, "string");
    assert.equal(body._envelope?.serverVersion, "0.1.0");
    assert.equal(body._envelope?.worldIndexStatus, null);
    assert.equal(body.data?.ok, true);
    assert.equal(body.data?.version, "0.1.0");
  } finally {
    await server.close();
  }
});

test("world and story base routes return enveloped picker shapes", async () => {
  const repoRoot = createTempRepo();
  createStory(repoRoot);
  const server = await createServer({ repoRoot });

  try {
    const worldsResponse = await server.inject({ method: "GET", url: "/api/worlds" });
    const worldsBody = JSON.parse(worldsResponse.body) as { data?: Array<{ worldSlug?: string }> };
    assert.equal(worldsResponse.statusCode, 200);
    assert.equal(worldsBody.data?.[0]?.worldSlug, "fixture-world");

    const storiesResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories",
    });
    const storiesBody = JSON.parse(storiesResponse.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: Array<{ storySlug?: string; storyId?: string; pageCount?: number }>;
    };

    assert.equal(storiesResponse.statusCode, 200);
    assert.equal(storiesBody._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(storiesBody.data?.[0]?.storySlug, "red-bunny");
    assert.equal(storiesBody.data?.[0]?.storyId, "STORY-1");
    assert.equal(storiesBody.data?.[0]?.pageCount, 1);

    const storyResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny",
    });
    const storyBody = JSON.parse(storyResponse.body) as { data?: { storySlug?: string } };
    assert.equal(storyResponse.statusCode, 200);
    assert.equal(storyBody.data?.storySlug, "red-bunny");
  } finally {
    await server.close();
  }
});
