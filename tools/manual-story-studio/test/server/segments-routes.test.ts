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
import type {
  ManualConsequenceRecord,
  RecordCommonFields,
  SegmentSidecar,
} from "../../src/schema/manual-story.js";
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
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "segments-routes-"));
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
  seedPrompt(root);
  return { repoRoot, worldSlug, msSlug, root };
}

function seedPrompt(root: ManualStoryRoot): void {
  safeWriteFile(root, "prompts/PROMPT-1.md", "Write the lantern scene.\n");
  safeWriteFile(
    root,
    "prompt-runs/PROMPT-1.yaml",
    YAML.stringify({
      id: "PROMPT-1",
      created_at: "2026-05-31T09:00:00.000Z",
      manual_story_slug: "fixture-story",
      included_cast: ["mchar-1"],
      included_records: ["mbel-1"],
      included_template_path: "mtemplate-1",
      moment_directive: "Write the lantern scene.",
      prompt_sha256: "stored-sha",
    }),
  );
}

function commonFields(id: string): RecordCommonFields {
  return {
    id,
    title: id,
    active: true,
    importance: "medium",
    tags: [],
    summary: "",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    last_reviewed_after_segment: null,
    notes: "",
  };
}

function seedConsequence(root: ManualStoryRoot, segmentId: string): void {
  const record: ManualConsequenceRecord = {
    ...commonFields("mcnsq-1"),
    caused_by_segment: segmentId,
    pending: true,
    urgency: "low",
  };
  safeWriteFile(
    root,
    "records/consequences/mcnsq-1.yaml",
    YAML.stringify(record),
  );
}

function readMetadata(root: ManualStoryRoot): { segment_order: string[] } {
  return YAML.parse(
    readFileSync(path.join(root.absolutePath, "manual-story.yaml"), "utf8"),
  ) as { segment_order: string[] };
}

async function saveSegmentThroughRoute(fixture: Fixture): Promise<string> {
  const server = await createServer({ repoRoot: fixture.repoRoot });
  try {
    const response = await server.inject({
      method: "POST",
      url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
      payload: {
        prose: "Lanterns rise.",
        title: "Lanterns",
        prompt_id: "PROMPT-1",
        author_note: "draft",
      },
    });
    assert.equal(response.statusCode, 201);
    const body = response.json() as { segment_id: string };
    return body.segment_id;
  } finally {
    await server.close();
  }
}

test("POST /segments saves SEG-1, appends segment_order, compiles manuscript, and returns checklist", async () => {
  const fixture = mkWorld();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
        payload: {
          prose: "Lanterns rise.",
          title: "Lanterns",
          prompt_id: "PROMPT-1",
          author_note: "draft",
        },
      });
      assert.equal(response.statusCode, 201);
      const body = response.json() as {
        segment_id: string;
        sidecar: SegmentSidecar;
        checklist_payload: { segment_id: string; entries: unknown[] };
      };
      assert.equal(body.segment_id, "SEG-1");
      assert.equal(body.sidecar.id, "SEG-1");
      assert.equal(body.sidecar.title, "Lanterns");
      assert.equal(body.checklist_payload.segment_id, "SEG-1");
      assert.equal(body.checklist_payload.entries.length, 12);
      assert.deepEqual(readMetadata(fixture.root).segment_order, ["SEG-1"]);
      assert.equal(
        readFileSync(
          path.join(fixture.root.absolutePath, "segments", "SEG-1.md"),
          "utf8",
        ),
        "Lanterns rise.",
      );
      assert.ok(
        existsSync(path.join(fixture.root.absolutePath, "manuscript.md")),
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("GET /segments lists saved segments and GET /segments/:id reads body plus sidecar", async () => {
  const fixture = mkWorld();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const empty = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
      });
      assert.equal(empty.statusCode, 200);
      assert.deepEqual(empty.json(), { segments: [] });

      await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
        payload: { prose: "Lanterns rise.", title: "Lanterns" },
      });

      const list = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
      });
      assert.equal(list.statusCode, 200);
      const listBody = list.json() as { segments: Array<{ id: string }> };
      assert.equal(listBody.segments.length, 1);
      assert.equal(listBody.segments[0]?.id, "SEG-1");

      const single = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1`,
      });
      assert.equal(single.statusCode, 200);
      const singleBody = single.json() as { body: string; sidecar: SegmentSidecar };
      assert.equal(singleBody.body, "Lanterns rise.");
      assert.equal(singleBody.sidecar.id, "SEG-1");

      const missing = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-99`,
      });
      assert.equal(missing.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("GET /segments with corrupt sidecar returns 409 HealthReport", async () => {
  const fixture = mkWorld();
  try {
    mkdirSync(path.join(fixture.root.absolutePath, "segments"), {
      recursive: true,
    });
    writeFileSync(
      path.join(fixture.root.absolutePath, "segments", "SEG-1.yaml"),
      "title: [unterminated\n",
    );
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
      });

      assert.equal(response.statusCode, 409);
      const body = response.json() as {
        status: string;
        findings: Array<{ code: string }>;
      };
      assert.equal(body.status, "blocked");
      assert.equal(body.findings[0]?.code, "yaml_parse_failed");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("PUT /segments/:id edits an existing segment in place", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture);
    const before = YAML.parse(
      readFileSync(
        path.join(fixture.root.absolutePath, "segments", "SEG-1.yaml"),
        "utf8",
      ),
    ) as SegmentSidecar;
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "PUT",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1`,
        payload: {
          prose: "Lanterns rise again.",
          author_note: "revised",
        },
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { segment_id: string; sidecar: SegmentSidecar };
      assert.equal(body.segment_id, "SEG-1");
      assert.equal(body.sidecar.id, "SEG-1");
      assert.equal(body.sidecar.created_at, before.created_at);
      assert.equal(body.sidecar.word_count, 3);
      assert.deepEqual(readMetadata(fixture.root).segment_order, ["SEG-1"]);
      assert.equal(
        readFileSync(
          path.join(fixture.root.absolutePath, "segments", "SEG-1.md"),
          "utf8",
        ),
        "Lanterns rise again.",
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("DELETE /segments/:id hard-deletes unreferenced segments", async () => {
  const fixture = mkWorld();
  try {
    await saveSegmentThroughRoute(fixture);
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { outcome: string; referrers: unknown[] };
      assert.equal(body.outcome, "hard_deleted");
      assert.deepEqual(body.referrers, []);
      assert.equal(
        existsSync(path.join(fixture.root.absolutePath, "segments", "SEG-1.md")),
        false,
      );
      assert.equal(
        existsSync(path.join(fixture.root.absolutePath, "segments", "SEG-1.yaml")),
        false,
      );
      assert.deepEqual(readMetadata(fixture.root).segment_order, []);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("DELETE /segments/:id preserves referenced segments unless force=true", async () => {
  const preserveFixture = mkWorld();
  const forceFixture = mkWorld();
  try {
    await saveSegmentThroughRoute(preserveFixture);
    seedConsequence(preserveFixture.root, "SEG-1");
    const preserveServer = await createServer({ repoRoot: preserveFixture.repoRoot });
    try {
      const response = await preserveServer.inject({
        method: "DELETE",
        url: `/api/worlds/${preserveFixture.worldSlug}/manual-stories/${preserveFixture.msSlug}/segments/SEG-1`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        outcome: string;
        referrers: Array<{ id: string }>;
      };
      assert.equal(body.outcome, "segment_order_removed_files_preserved");
      assert.deepEqual(body.referrers.map((r) => r.id), ["mcnsq-1"]);
      assert.equal(
        existsSync(
          path.join(preserveFixture.root.absolutePath, "segments", "SEG-1.md"),
        ),
        true,
      );
      assert.deepEqual(readMetadata(preserveFixture.root).segment_order, []);
    } finally {
      await preserveServer.close();
    }

    await saveSegmentThroughRoute(forceFixture);
    seedConsequence(forceFixture.root, "SEG-1");
    const forceServer = await createServer({ repoRoot: forceFixture.repoRoot });
    try {
      const response = await forceServer.inject({
        method: "DELETE",
        url: `/api/worlds/${forceFixture.worldSlug}/manual-stories/${forceFixture.msSlug}/segments/SEG-1?force=true`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        outcome: string;
        referrers: Array<{ id: string }>;
        warning: string;
      };
      assert.equal(body.outcome, "force_deleted");
      assert.deepEqual(body.referrers.map((r) => r.id), ["mcnsq-1"]);
      assert.match(body.warning, /mcnsq-1/);
      assert.equal(
        existsSync(
          path.join(forceFixture.root.absolutePath, "segments", "SEG-1.md"),
        ),
        false,
      );
    } finally {
      await forceServer.close();
    }
  } finally {
    rmSync(preserveFixture.repoRoot, { recursive: true, force: true });
    rmSync(forceFixture.repoRoot, { recursive: true, force: true });
  }
});
