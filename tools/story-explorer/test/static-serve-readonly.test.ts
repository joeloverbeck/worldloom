import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createServer } from "../src/server/http.js";

function createTempRepo(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-static-"));
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(repoRoot, "worlds"), { recursive: true });
  return repoRoot;
}

function createTempRepoWithWebDist(): string {
  const repoRoot = createTempRepo();
  const webDist = path.join(repoRoot, "tools", "story-explorer", "web", "dist");

  mkdirSync(webDist, { recursive: true });
  writeFileSync(
    path.join(webDist, "index.html"),
    "<!doctype html><html><body><main id=\"root\">Story Explorer</main></body></html>\n",
    "utf8",
  );

  return repoRoot;
}

test("static serve is skipped when web/dist is absent", async () => {
  const server = await createServer({ repoRoot: createTempRepo() });

  try {
    const response = await server.inject({ method: "GET", url: "/" });

    assert.equal(response.statusCode, 404);
  } finally {
    await server.close();
  }
});

test("static serve returns the web bundle when web/dist is present", async () => {
  const server = await createServer({ repoRoot: createTempRepoWithWebDist() });

  try {
    const response = await server.inject({ method: "GET", url: "/" });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"]?.toString() ?? "", /text\/html/);
    assert.match(response.body, /Story Explorer/);
  } finally {
    await server.close();
  }
});

test("static serve keeps the API envelope on API routes", async () => {
  const server = await createServer({ repoRoot: createTempRepoWithWebDist() });

  try {
    const response = await server.inject({ method: "GET", url: "/api/health" });
    const body = JSON.parse(response.body) as {
      _envelope?: { requestId?: string; serverVersion?: string };
      data?: { ok?: boolean };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(typeof body._envelope?.requestId, "string");
    assert.equal(body._envelope?.serverVersion, "0.1.0");
    assert.equal(body.data?.ok, true);
  } finally {
    await server.close();
  }
});

test("static serve does not permit write routes after registration", async () => {
  const server = await createServer({ repoRoot: createTempRepoWithWebDist() });

  try {
    assert.throws(
      () => server.post("/index.html", async () => ({ ok: false })),
      /read-only fence violation: POST \/index\.html/,
    );
  } finally {
    await server.close();
  }
});
