import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import { wrapRouterReadOnly } from "../src/server/readonly-guard.js";

type MockRoute = {
  method: string | string[];
  url: string;
};

function createMockRouter() {
  const registered: MockRoute[] = [];

  return {
    registered,
    route(options: MockRoute) {
      registered.push(options);
      return this;
    },
    addRoute(method: string, url: string) {
      registered.push({ method, url });
      return this;
    },
    get(url: string) {
      registered.push({ method: "GET", url });
      return this;
    },
    post(url: string) {
      registered.push({ method: "POST", url });
      return this;
    },
    put(url: string) {
      registered.push({ method: "PUT", url });
      return this;
    },
    patch(url: string) {
      registered.push({ method: "PATCH", url });
      return this;
    },
    delete(url: string) {
      registered.push({ method: "DELETE", url });
      return this;
    },
  };
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(entryPath);
      }

      return [entryPath];
    }),
  );

  return files.flat();
}

test("Layer 1: story-explorer manifest excludes mutation-surface packages", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencyNames = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);

  assert.equal(dependencyNames.has("@worldloom/patch-engine"), false);
  assert.equal(dependencyNames.has("@worldloom/world-mcp"), false);
});

test("Layer 2: read-only guard allows GET route registrations", () => {
  const router = wrapRouterReadOnly(createMockRouter());

  router.route({ method: "GET", url: "/api/health" });
  router.addRoute("GET", "/api/worlds");
  router.get("/api/worlds/:slug");

  assert.deepEqual(
    router.registered.map((route) => route.method),
    ["GET", "GET", "GET"],
  );
});

test("Layer 2: read-only guard rejects non-GET route registrations", () => {
  const directCases: Array<[MockRoute, RegExp]> = [
    [{ method: "POST", url: "/api/write" }, /read-only fence violation: POST \/api\/write/],
    [{ method: "PUT", url: "/api/write" }, /read-only fence violation: PUT \/api\/write/],
    [{ method: "PATCH", url: "/api/write" }, /read-only fence violation: PATCH \/api\/write/],
    [{ method: "DELETE", url: "/api/write" }, /read-only fence violation: DELETE \/api\/write/],
    [{ method: "OPTIONS", url: "/api/write" }, /read-only fence violation: OPTIONS \/api\/write/],
    [{ method: ["GET", "POST"], url: "/api/mixed" }, /read-only fence violation: POST \/api\/mixed/],
  ];

  for (const [route, message] of directCases) {
    const router = wrapRouterReadOnly(createMockRouter());
    assert.throws(() => router.route(route), message);
  }

  const addRouteRouter = wrapRouterReadOnly(createMockRouter());
  assert.throws(() => addRouteRouter.addRoute("POST", "/api/write"), /read-only fence violation: POST \/api\/write/);

  const shorthandRouter = wrapRouterReadOnly(createMockRouter());
  assert.throws(() => shorthandRouter.post("/api/write"), /read-only fence violation: POST \/api\/write/);
  assert.throws(() => shorthandRouter.put("/api/write"), /read-only fence violation: PUT \/api\/write/);
  assert.throws(() => shorthandRouter.patch("/api/write"), /read-only fence violation: PATCH \/api\/write/);
  assert.throws(() => shorthandRouter.delete("/api/write"), /read-only fence violation: DELETE \/api\/write/);
});

test("Layer 3: compiled production output does not reference filesystem write APIs", async () => {
  const productionFiles = (await listFiles(new URL("../src", import.meta.url).pathname)).filter((file) =>
    file.endsWith(".js"),
  );
  const forbiddenWriteFragments = [
    "fs." + "write",
    "write" + "File",
    "append" + "File",
    "mkdir",
    "rmSync",
    "rename",
    "create" + "Write" + "Stream",
  ];

  for (const file of productionFiles) {
    const content = await readFile(file, "utf8");
    for (const fragment of forbiddenWriteFragments) {
      assert.equal(content.includes(fragment), false, `${file} references ${fragment}`);
    }
  }
});

test("Layer 4: compiled production output does not invoke world-index refresh commands", async () => {
  const productionFiles = (await listFiles(new URL("../src", import.meta.url).pathname)).filter((file) =>
    file.endsWith(".js"),
  );

  for (const file of productionFiles) {
    const content = await readFile(file, "utf8");
    const mentionsWorldIndexRefresh =
      content.includes("world-index") && (content.includes(" build") || content.includes(" sync"));
    const mentionsProcessExecution =
      content.includes("child_process") ||
      content.includes("spawn") ||
      content.includes("execSync") ||
      content.includes("spawnSync") ||
      content.includes("execFile");

    assert.equal(
      mentionsWorldIndexRefresh && mentionsProcessExecution,
      false,
      `${file} references a world-index refresh execution path`,
    );
  }
});
