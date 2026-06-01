import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { createServer } from "../../src/server/http.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import { SEGMENT_REPAIR_MODE_FLAG } from "../../src/write/segment-modes.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

interface Fixture {
  repoRoot: string;
  worldSlug: string;
  msSlug: string;
  root: ManualStoryRoot;
}

function mkWorld(): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "segment-lifecycle-"));
  const worldSlug = "fixture-world";
  const msSlug = "fixture-story";
  mkdirSync(path.join(repoRoot, "worlds", worldSlug), { recursive: true });
  const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
  mkdirSync(root.absolutePath, { recursive: true });
  safeWriteFile(
    root,
    "manual-story.yaml",
    YAML.stringify(
      makeDefaultManualStoryMetadata(
        worldSlug,
        msSlug,
        "Fixture Story",
        "2026-06-01T00:00:00.000Z",
      ),
    ),
  );
  return { repoRoot, worldSlug, msSlug, root };
}

function readMetadata(root: ManualStoryRoot): { segment_order: string[] } {
  return YAML.parse(
    readFileSync(path.join(root.absolutePath, "manual-story.yaml"), "utf8"),
  ) as { segment_order: string[] };
}

async function saveSegmentThroughRoute(
  fixture: Fixture,
  prose = "Lanterns rise.",
): Promise<string> {
  const server = await createServer({ repoRoot: fixture.repoRoot });
  try {
    const response = await server.inject({
      method: "POST",
      url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
      payload: {
        prose,
        title: prose.slice(0, 16),
      },
    });
    assert.equal(response.statusCode, 201);
    return (response.json() as { segment_id: string }).segment_id;
  } finally {
    await server.close();
  }
}

test("AC #1: POST /segments appends without repair mode", async () => {
  const fixture = mkWorld();
  try {
    const segmentId = await saveSegmentThroughRoute(fixture);
    assert.equal(segmentId, "SEG-1");
    assert.deepEqual(readMetadata(fixture.root).segment_order, ["SEG-1"]);
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #2: PUT without mode flag returns 405 with repair-mode-required", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture);
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1`,
        payload: { prose: "Blocked rewrite." },
      });
      assert.equal(response.statusCode, 405);
      assert.equal(
        (response.json() as { error: string }).error,
        "repair-mode-required",
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #3: PUT with repair mode succeeds for the latest segment", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture);
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1?mode=${SEGMENT_REPAIR_MODE_FLAG}`,
        payload: { prose: "Latest repaired." },
      });
      assert.equal(response.statusCode, 200);
      assert.equal(
        readFileSync(
          path.join(fixture.root.absolutePath, "segments", "SEG-1.md"),
          "utf8",
        ),
        "Latest repaired.",
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #4: PUT with repair mode blocks non-latest replacement without force_replace", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture, "First segment.");
    await saveSegmentThroughRoute(fixture, "Second segment.");
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1?mode=${SEGMENT_REPAIR_MODE_FLAG}`,
        payload: { prose: "Blocked non-latest repair." },
      });
      assert.equal(response.statusCode, 422);
      const body = response.json() as {
        error: string;
        segment_id: string;
        latest_segment_id: string;
      };
      assert.equal(body.error, "repair-replace-non-latest-blocked");
      assert.equal(body.segment_id, "SEG-1");
      assert.equal(body.latest_segment_id, "SEG-2");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #4: PUT with repair mode and force_replace succeeds for a non-latest segment", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture, "First segment.");
    await saveSegmentThroughRoute(fixture, "Second segment.");
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1?mode=${SEGMENT_REPAIR_MODE_FLAG}`,
        payload: {
          prose: "Forced repair.",
          force_replace: true,
        },
      });
      assert.equal(response.statusCode, 200);
      assert.equal(
        readFileSync(
          path.join(fixture.root.absolutePath, "segments", "SEG-1.md"),
          "utf8",
        ),
        "Forced repair.",
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #5: DELETE without mode flag returns 405 with repair-mode-required", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture);
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1`,
      });
      assert.equal(response.statusCode, 405);
      assert.equal(
        (response.json() as { error: string }).error,
        "repair-mode-required",
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #6: DELETE with repair mode preserves existing hard-delete outcome", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture);
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1?mode=${SEGMENT_REPAIR_MODE_FLAG}`,
      });
      assert.equal(response.statusCode, 200);
      assert.equal(
        (response.json() as { outcome: string }).outcome,
        "hard_deleted",
      );
      assert.deepEqual(readMetadata(fixture.root).segment_order, []);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});
