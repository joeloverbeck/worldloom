import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { createServer } from "../../src/server/http.js";
import type {
  HealthReport,
} from "../../src/health/types.js";
import type { ManualFactRecord } from "../../src/schema/manual-story.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

interface Fixture {
  repoRoot: string;
  worldSlug: string;
  msSlug: string;
  root: ManualStoryRoot;
}

function mkFixture(): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "health-route-"));
  const worldSlug = "fixture-world";
  const msSlug = "fixture-story";
  const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
  mkdirSync(root.absolutePath, { recursive: true });
  writeMetadata(root, []);
  return { repoRoot, worldSlug, msSlug, root };
}

function writeMetadata(root: ManualStoryRoot, segmentOrder: string[]): void {
  const metadata = makeDefaultManualStoryMetadata(
    root.worldSlug,
    root.manualStorySlug,
    "Fixture Story",
    "2026-06-01T00:00:00.000Z",
  );
  metadata.segment_order = segmentOrder;
  writeFileSync(
    path.join(root.absolutePath, "manual-story.yaml"),
    YAML.stringify(metadata),
  );
}

function writeFact(root: ManualStoryRoot, record: Partial<ManualFactRecord> = {}): void {
  const fact: ManualFactRecord = {
    id: "mfact-1",
    title: "Lantern fact",
    active: true,
    importance: "medium",
    tags: [],
    summary: "Lanterns matter.",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    last_reviewed_after_segment: null,
    notes: "",
    ...record,
  };
  const dir = path.join(root.absolutePath, "records", "facts");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${fact.id}.yaml`), YAML.stringify(fact));
}

async function getHealth(fixture: Fixture) {
  const server = await createServer({ repoRoot: fixture.repoRoot });
  try {
    return await server.inject({
      method: "GET",
      url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/health`,
    });
  } finally {
    await server.close();
  }
}

test("GET /health returns ok HealthReport for a valid manual story", async () => {
  const fixture = mkFixture();
  try {
    const response = await getHealth(fixture);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json() as HealthReport, {
      status: "ok",
      findings: [],
      blocked_actions: [],
    });
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("GET /health returns 200 blocked HealthReport for corrupt metadata", async () => {
  const fixture = mkFixture();
  try {
    writeFileSync(
      path.join(fixture.root.absolutePath, "manual-story.yaml"),
      "schema_version: [unterminated",
    );

    const response = await getHealth(fixture);

    assert.equal(response.statusCode, 200);
    const body = response.json() as HealthReport;
    assert.equal(body.status, "blocked");
    assert.equal(body.findings.length, 1);
    assert.equal(body.findings[0]?.code, "metadata-yaml-parse-failed");
    assert.equal(body.findings[0]?.severity, "blocking");
    assert.deepEqual(body.blocked_actions, [
      "prompt_copy",
      "prompt_save",
      "segment_save",
      "manuscript_compile",
    ]);
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("GET /health returns 200 blocked HealthReport for a missing segment sidecar", async () => {
  const fixture = mkFixture();
  try {
    writeMetadata(fixture.root, ["SEG-1"]);
    mkdirSync(path.join(fixture.root.absolutePath, "segments"), {
      recursive: true,
    });
    writeFileSync(
      path.join(fixture.root.absolutePath, "segments", "SEG-1.md"),
      "A segment body.",
    );

    const response = await getHealth(fixture);

    assert.equal(response.statusCode, 200);
    const body = response.json() as HealthReport;
    assert.equal(body.status, "blocked");
    assert.equal(body.findings.length, 1);
    assert.equal(body.findings[0]?.code, "segment-sidecar-missing");
    assert.equal(body.findings[0]?.severity, "blocking");
    assert.ok(body.blocked_actions.includes("manuscript_compile"));
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("GET /health returns 200 degraded HealthReport for a dangling typed ref", async () => {
  const fixture = mkFixture();
  try {
    writeFact(fixture.root, {
      refs: {
        characters: ["mchar-999"],
        locations: [],
        related_records: [],
      },
    });

    const response = await getHealth(fixture);

    assert.equal(response.statusCode, 200);
    const body = response.json() as HealthReport;
    assert.equal(body.status, "degraded");
    assert.equal(body.findings.length, 1);
    assert.equal(body.findings[0]?.code, "reference-resolution-failed");
    assert.equal(body.findings[0]?.severity, "error");
    assert.deepEqual(body.blocked_actions, []);
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("GET /health returns 404 for a missing manual story", async () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "health-route-"));
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/worlds/missing-world/manual-stories/missing-story/health",
      });

      assert.equal(response.statusCode, 404);
      assert.deepEqual(response.json(), { error: "not_found" });
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
