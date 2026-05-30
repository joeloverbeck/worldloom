import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { createServer } from "../../src/server/http.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
} from "../../src/write/sandbox.js";

function mkWorld() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-metaroute-"));
  const worldSlug = "test-world";
  const msSlug = "test-story";
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
        "T",
        "2026-05-30T00:00:00.000Z",
      ),
    ),
  );
  return { repoRoot, worldSlug, msSlug };
}

test("metadata routes: GET happy path returns parsed metadata", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/metadata`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { metadata: { title: string } };
      assert.equal(body.metadata.title, "T");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("metadata routes: PUT happy path returns ok:true", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const metadata = makeDefaultManualStoryMetadata(
        worldSlug,
        msSlug,
        "UPDATED",
        "2026-05-30T00:00:00.000Z",
      );
      const response = await server.inject({
        method: "PUT",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/metadata`,
      payload: { metadata },
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { ok: boolean };
      assert.equal(body.ok, true);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("metadata routes: PUT with invalid enum → 400 validation_failed", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const metadata = makeDefaultManualStoryMetadata(
        worldSlug,
        msSlug,
        "T",
        "2026-05-30T00:00:00.000Z",
      );
      const broken = {
        ...metadata,
        story_contract: {
          ...metadata.story_contract,
          pov: "third-omniscient",
        },
      };
      const response = await server.inject({
        method: "PUT",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/metadata`,
        payload: { metadata: broken },
      });
      assert.equal(response.statusCode, 400);
      const body = response.json() as { error: string };
      assert.equal(body.error, "validation_failed");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("metadata routes: GET on missing world → 404", async () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-metaroute-"));
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/missing/manual-stories/missing/metadata`,
      });
      assert.equal(response.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
