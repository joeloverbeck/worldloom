import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { compileManuscript } from "../../src/manuscript/compile.js";
import type { ReadResult } from "../../src/read/result.js";
import { createServer } from "../../src/server/http.js";
import type { SegmentSidecar } from "../../src/schema/manual-story.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
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
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manuscript-routes-"));
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
        "2026-05-31T00:00:00.000Z",
      ),
    ),
  );
  return { repoRoot, worldSlug, msSlug, root };
}

function seedSegment(root: ManualStoryRoot, segmentId: string, title: string): void {
  const index = Number(/-(\d+)$/.exec(segmentId)?.[1] ?? "0");
  safeWriteFile(root, `segments/${segmentId}.md`, `${title} body ${index}.`);
  const sidecar: SegmentSidecar = {
    id: segmentId,
    created_at: "2026-05-31T09:00:00.000Z",
    updated_at: "2026-05-31T09:00:00.000Z",
    title,
    prompt_id: null,
    prompt_sha256: null,
    moment_directive: "",
    selected_template: null,
    included_record_summary: { characters: [], records: [] },
    author_note: "",
    word_count: 3,
  };
  safeWriteFile(root, `segments/${segmentId}.yaml`, YAML.stringify(sidecar));
}

function writeSegmentOrder(root: ManualStoryRoot, segmentOrder: string[]): void {
  const metadata = makeDefaultManualStoryMetadata(
    root.worldSlug,
    root.manualStorySlug,
    "Fixture Story",
    "2026-05-31T00:00:00.000Z",
  );
  metadata.segment_order = segmentOrder;
  safeWriteFile(root, "manual-story.yaml", YAML.stringify(metadata));
}

function unwrap<T>(result: ReadResult<T>): T {
  if (!result.ok) assert.fail(`expected ok result, got ${result.error.code}`);
  return result.value;
}

test("GET /manuscript returns compiled manuscript body and counts", async () => {
  const fixture = mkWorld();
  try {
    seedSegment(fixture.root, "SEG-1", "Opening");
    writeSegmentOrder(fixture.root, ["SEG-1"]);
    unwrap(compileManuscript({ manualStoryRoot: fixture.root }));

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        body: string;
        byte_count: number;
        word_count: number;
        manuscript_path: string;
      };
      assert.equal(body.body, "Opening body 1.");
      assert.equal(body.byte_count, statSync(body.manuscript_path).size);
      assert.equal(body.word_count, 3);
      assert.equal(body.manuscript_path, path.join(fixture.root.absolutePath, "manuscript.md"));
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("GET /manuscript returns 404 when manuscript.md has not been compiled", async () => {
  const fixture = mkWorld();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript`,
      });
      assert.equal(response.statusCode, 404);
      assert.deepEqual(response.json(), { error: "manuscript_not_compiled_yet" });
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("POST /manuscript/rebuild returns 409 HealthReport for corrupt metadata", async () => {
  const fixture = mkWorld();
  try {
    safeWriteFile(
      fixture.root,
      "manual-story.yaml",
      "schema_version: [unterminated",
    );

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript/rebuild`,
      });

      assert.equal(response.statusCode, 409);
      const body = response.json() as {
        status: string;
        findings: Array<{ code: string; path: string }>;
        blocked_actions: string[];
      };
      assert.equal(body.status, "blocked");
      assert.equal(body.findings[0]?.code, "metadata-yaml-parse-failed");
      assert.equal(
        body.findings[0]?.path,
        path.join(fixture.root.absolutePath, "manual-story.yaml"),
      );
      assert.ok(body.blocked_actions.includes("manuscript_compile"));
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("POST /manuscript/rebuild compiles ordered segments", async () => {
  const fixture = mkWorld();
  try {
    seedSegment(fixture.root, "SEG-1", "Opening");
    seedSegment(fixture.root, "SEG-2", "Middle");
    seedSegment(fixture.root, "SEG-3", "Ending");
    writeSegmentOrder(fixture.root, ["SEG-1", "SEG-2", "SEG-3"]);

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript/rebuild`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        manuscript_path: string;
        segments_compiled: number;
        byte_count: number;
      };
      assert.equal(body.segments_compiled, 3);
      assert.ok(body.byte_count > 0);
      assert.equal(
        readFileSync(body.manuscript_path, "utf8"),
        "Opening body 1.\n\nMiddle body 2.\n\nEnding body 3.",
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("POST /manuscript/rebuild writes an empty manuscript for empty segment_order", async () => {
  const fixture = mkWorld();
  try {
    writeSegmentOrder(fixture.root, []);
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript/rebuild`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        manuscript_path: string;
        segments_compiled: number;
        byte_count: number;
      };
      assert.equal(body.segments_compiled, 0);
      assert.equal(body.byte_count, 0);
      assert.equal(readFileSync(body.manuscript_path, "utf8"), "");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("POST /manuscript/rebuild is idempotent for unchanged inputs", async () => {
  const fixture = mkWorld();
  try {
    seedSegment(fixture.root, "SEG-1", "Opening");
    seedSegment(fixture.root, "SEG-2", "Middle");
    writeSegmentOrder(fixture.root, ["SEG-2", "SEG-1"]);

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const url = `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript/rebuild`;
      const first = await server.inject({ method: "POST", url });
      assert.equal(first.statusCode, 200);
      const firstPath = (first.json() as { manuscript_path: string }).manuscript_path;
      const firstBody = readFileSync(firstPath, "utf8");

      const second = await server.inject({ method: "POST", url });
      assert.equal(second.statusCode, 200);
      const secondPath = (second.json() as { manuscript_path: string }).manuscript_path;
      assert.equal(readFileSync(secondPath, "utf8"), firstBody);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});
