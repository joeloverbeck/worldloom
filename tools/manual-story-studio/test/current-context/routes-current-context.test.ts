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

import YAML from "yaml";

import { createServer } from "../../src/server/http.js";
import type { CurrentContext } from "../../src/schema/current-context.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

function mkWorld(): {
  repoRoot: string;
  worldSlug: string;
  msSlug: string;
  root: ManualStoryRoot;
} {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "manual-studio-current-context-route-"),
  );
  const worldSlug = "test-world";
  const msSlug = "test-story";
  mkdirSync(path.join(repoRoot, "worlds", worldSlug), { recursive: true });
  const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
  mkdirSync(root.absolutePath, { recursive: true });
  const metadata = makeDefaultManualStoryMetadata(
    worldSlug,
    msSlug,
    "T",
    "2026-06-02T00:00:00.000Z",
  );
  metadata.segment_order = ["SEG-1"];
  safeWriteFile(root, "manual-story.yaml", YAML.stringify(metadata));
  writeRecordFixtures(root);
  return { repoRoot, worldSlug, msSlug, root };
}

function writeRecordFixtures(root: ManualStoryRoot): void {
  const fixtures: Array<[relativePath: string, id: string]> = [
    ["records/locations/mloc-1.yaml", "mloc-1"],
    ["records/cast/mchar-1.yaml", "mchar-1"],
    ["records/cast/mchar-2.yaml", "mchar-2"],
    ["records/clocks/mclock-1.yaml", "mclock-1"],
    ["records/secrets/msecret-1.yaml", "msecret-1"],
    ["records/questions/mq-1.yaml", "mq-1"],
    ["records/relationships/mrel-1.yaml", "mrel-1"],
    ["records/objects/mobj-1.yaml", "mobj-1"],
  ];
  for (const [relativePath, id] of fixtures) {
    safeWriteFile(root, relativePath, YAML.stringify({ id, title: id }));
  }
}

function context(overrides: Partial<CurrentContext> = {}): CurrentContext {
  return {
    current_location: "mloc-1",
    current_cast: ["mchar-1"],
    pov_holder: "mchar-1",
    active_pressure_clocks: ["mclock-1"],
    active_secrets_questions: ["msecret-1", "mq-1"],
    pinned_records: ["mrel-1", "mobj-1"],
    must_not_reveal: ["msecret-1"],
    current_handoff_summary: "Mara waits in the riverhouse kitchen.",
    last_accepted_segment: "SEG-1",
    last_reviewed_after_segment: null,
    ...overrides,
  };
}

function route(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${worldSlug}/manual-stories/${msSlug}/current-context`;
}

test("current-context route: GET valid file returns parsed payload", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const ctx = context();
    safeWriteFile(root, "current-context.yaml", YAML.stringify(ctx));
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: route(worldSlug, msSlug),
      });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), ctx);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("current-context route: GET absent file returns null", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: route(worldSlug, msSlug),
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json(), null);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("current-context route: GET corrupt file returns 409", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    writeFileSync(
      path.join(root.absolutePath, "current-context.yaml"),
      "current_location: [unterminated\n",
    );
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: route(worldSlug, msSlug),
      });
      assert.equal(response.statusCode, 409);
      const body = response.json() as { error: string; path: string };
      assert.equal(body.error, "current-context-yaml-parse-failed");
      assert.match(body.path, /current-context\.yaml$/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("current-context route: PUT valid body writes file and returns 200", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const ctx = context();
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: route(worldSlug, msSlug),
        payload: ctx,
      });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), ctx);
      const fullPath = path.join(root.absolutePath, "current-context.yaml");
      assert.equal(existsSync(fullPath), true);
      assert.deepEqual(YAML.parse(readFileSync(fullPath, "utf8")), ctx);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("current-context route: PUT invalid POV holder returns 422", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: route(worldSlug, msSlug),
        payload: context({ pov_holder: "mchar-2" }),
      });
      assert.equal(response.statusCode, 422);
      const body = response.json() as {
        error: string;
        findings: Array<{ code?: string }>;
      };
      assert.equal(body.error, "validation_failed");
      assert.equal(body.findings[0]?.code, "current-context-pov-not-in-cast");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("current-context route: PUT state-reviewed segment writes reviewed marker", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const ctx = context({ last_reviewed_after_segment: "SEG-1" });
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: route(worldSlug, msSlug),
        payload: ctx,
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().last_reviewed_after_segment, "SEG-1");
      const fullPath = path.join(root.absolutePath, "current-context.yaml");
      const onDisk = YAML.parse(readFileSync(fullPath, "utf8")) as CurrentContext;
      assert.equal(onDisk.last_reviewed_after_segment, "SEG-1");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("current-context route: PUT unknown pinned record returns 422", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: route(worldSlug, msSlug),
        payload: context({ pinned_records: ["mfact-99"] }),
      });
      assert.equal(response.statusCode, 422);
      const body = response.json() as {
        error: string;
        findings: Array<{ code?: string; field: string }>;
      };
      assert.equal(body.error, "validation_failed");
      assert.equal(body.findings[0]?.code, "current-context-reference-broken");
      assert.equal(body.findings[0]?.field, "pinned_records[0]");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
