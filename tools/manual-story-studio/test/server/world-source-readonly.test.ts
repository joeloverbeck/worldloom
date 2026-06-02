import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { createServer } from "../../src/server/http.js";
import { registerWorldSourceReadRoutes } from "../../src/server/routes/world-source.js";
import { wrapRouterWritable } from "../../src/server/write-scope-guard.js";

interface RecordedRoute {
  method: string;
  path: string;
}

interface StubRouter {
  routes: RecordedRoute[];
  get: (path: string, handler?: unknown) => void;
  post: (path: string, handler?: unknown) => void;
  put: (path: string, handler?: unknown) => void;
  patch: (path: string, handler?: unknown) => void;
  delete: (path: string, handler?: unknown) => void;
  options: (path: string, handler?: unknown) => void;
}

function createStubRouter(): StubRouter {
  const routes: RecordedRoute[] = [];
  const recordMethod = (method: string) => (routePath: string) => {
    routes.push({ method, path: routePath });
  };
  return {
    routes,
    get: recordMethod("GET"),
    post: recordMethod("POST"),
    put: recordMethod("PUT"),
    patch: recordMethod("PATCH"),
    delete: recordMethod("DELETE"),
    options: recordMethod("OPTIONS"),
  };
}

function mkRepoRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-world-source-route-"));
}

function writeWorldFile(
  repoRoot: string,
  worldSlug: string,
  relativePath: string,
  body: string,
): void {
  const fullPath = path.join(repoRoot, "worlds", worldSlug, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, body);
}

test("world-source routes register only GET methods outside writable scope", async () => {
  const stub = createStubRouter();
  wrapRouterWritable(stub, () => {});

  await registerWorldSourceReadRoutes(stub as never, { repoRoot: "/repo" });

  assert.deepEqual(stub.routes, [
    { method: "GET", path: "/api/worlds/:worldSlug/source" },
    { method: "GET", path: "/api/worlds/:worldSlug/source/item" },
  ]);
});

test("GET /api/worlds/:world/source returns summaries without raw text", async () => {
  const repoRoot = mkRepoRoot();
  try {
    writeWorldFile(repoRoot, "test-world", "WORLD_KERNEL.md", "# Test World\n");
    writeWorldFile(
      repoRoot,
      "test-world",
      "_source/canon/CF-1.yaml",
      YAML.stringify({ title: "Canon One", tags: ["law"] }),
    );

    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/worlds/test-world/source",
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        items: Array<{ path: string; title?: string; raw_text?: string }>;
      };
      assert.deepEqual(
        body.items.map((item) => item.path),
        ["WORLD_KERNEL.md", "_source/canon/CF-1.yaml"],
      );
      assert.equal(body.items[1]?.title, "Canon One");
      assert.equal("raw_text" in (body.items[0] ?? {}), false);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET /api/worlds/:world/source/item returns one raw item by contained path", async () => {
  const repoRoot = mkRepoRoot();
  try {
    writeWorldFile(repoRoot, "test-world", "WORLD_KERNEL.md", "# Test World\n");
    writeWorldFile(
      repoRoot,
      "test-world",
      "_source/canon/CF-1.yaml",
      YAML.stringify({ title: "Canon One" }),
    );

    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/worlds/test-world/source/item?path=_source/canon/CF-1.yaml",
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { item: { path: string; raw_text: string } };
      assert.equal(body.item.path, "_source/canon/CF-1.yaml");
      assert.match(body.item.raw_text, /Canon One/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("world-source item route rejects absolute and traversal selectors", async () => {
  const repoRoot = mkRepoRoot();
  try {
    writeWorldFile(repoRoot, "test-world", "WORLD_KERNEL.md", "# Test World\n");
    const server = await createServer({ repoRoot });
    try {
      for (const itemPath of [
        "/tmp/escape.yaml",
        "../test-world/WORLD_KERNEL.md",
        "manual-stories/../_source/canon/CF-1.yaml",
        "..\\test-world\\WORLD_KERNEL.md",
      ]) {
        const response = await server.inject({
          method: "GET",
          url: `/api/worlds/test-world/source/item?path=${encodeURIComponent(itemPath)}`,
        });
        assert.equal(response.statusCode, 400, itemPath);
        assert.deepEqual(response.json(), {
          error: "bad_request",
          reason: "invalid_item_path",
        });
      }
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("world-source routes reject invalid world slug before filesystem lookup", async () => {
  const repoRoot = mkRepoRoot();
  try {
    writeWorldFile(repoRoot, "test-world", "WORLD_KERNEL.md", "# Test World\n");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/worlds/Bad%20Slug/source",
      });
      assert.equal(response.statusCode, 400);
      assert.deepEqual(response.json(), {
        error: "bad_request",
        reason: "invalid_world_slug",
      });
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
