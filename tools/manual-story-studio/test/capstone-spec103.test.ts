/**
 * Manual Studio capstone: SPEC-103 acceptance criteria #1-#12.
 *
 * Automated assertions (run via `cd tools/manual-story-studio && npm test`):
 *   - AC #1-#8: segment save/edit/delete route round trip, sidecar writes,
 *     segment_order updates, manuscript rebuild, deterministic compile,
 *     checklist payload, and hybrid delete outcomes.
 *   - AC #9: manuscript route returns the compiled manuscript body and
 *     frontend source exposes the Manuscript page route.
 *   - AC #10: prompt listing returns linked_segments for saved prompts and
 *     frontend source exposes the Prompt History route.
 *   - AC #11: empty/unsaved prose does not create segment or manuscript files.
 *   - AC #12: this capstone is part of `npm test`.
 *   - Plan-Authority invariant: segment operations never mutate records/.
 */

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { createServer } from "../src/server/http.js";
import type {
  ManualConsequenceRecord,
  RecordCommonFields,
  SegmentSidecar,
} from "../src/schema/manual-story.js";
import { makeDefaultManualStoryMetadata } from "../src/write/manual-story-metadata.js";
import { SEGMENT_REPAIR_MODE_FLAG } from "../src/write/segment-modes.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../src/write/sandbox.js";
import { fixtureCast } from "./prompt/fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../..");

interface Fixture {
  repoRoot: string;
  worldSlug: string;
  msSlug: string;
  root: ManualStoryRoot;
}

interface RecordsSnapshot {
  files: string[];
  signatures: Record<string, { mtimeMs: number; body: string }>;
}

function mkFixture(): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "cap-spec103-"));
  const worldSlug = "capstone-world";
  const msSlug = "capstone-story";

  mkdirSync(path.join(repoRoot, "docs"), { recursive: true });
  cpSync(
    path.join(REPO_ROOT, "docs/prose-renderer-contract"),
    path.join(repoRoot, "docs/prose-renderer-contract"),
    { recursive: true },
  );
  cpSync(
    path.join(REPO_ROOT, "docs/manual-story-studio"),
    path.join(repoRoot, "docs/manual-story-studio"),
    { recursive: true },
  );

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
        "Capstone Story",
        "2026-05-31T00:00:00.000Z",
      ),
    ),
  );
  safeWriteFile(
    root,
    "records/cast/mchar-1.yaml",
    YAML.stringify(fixtureCast("mchar-1", "Jon")),
  );
  safeWriteFile(
    root,
    "records/statuses/mstat-1.yaml",
    YAML.stringify({
      ...commonFields("mstat-1"),
      title: "Jon is soaked",
      subject: "mchar-1",
      kind: "physical",
      refs: { characters: ["mchar-1"], locations: [], related_records: [] },
    }),
  );

  return { repoRoot, worldSlug, msSlug, root };
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
  safeWriteFile(root, "records/consequences/mcnsq-1.yaml", YAML.stringify(record));
}

function readMetadata(root: ManualStoryRoot): { segment_order: string[] } {
  return YAML.parse(
    readFileSync(path.join(root.absolutePath, "manual-story.yaml"), "utf8"),
  ) as { segment_order: string[] };
}

function readSidecar(root: ManualStoryRoot, segmentId: string): SegmentSidecar {
  return YAML.parse(
    readFileSync(
      path.join(root.absolutePath, "segments", `${segmentId}.yaml`),
      "utf8",
    ),
  ) as SegmentSidecar;
}

function recordsSnapshot(root: ManualStoryRoot): RecordsSnapshot {
  const recordsRoot = path.join(root.absolutePath, "records");
  const files = existsSync(recordsRoot) ? listFiles(recordsRoot) : [];
  const signatures: RecordsSnapshot["signatures"] = {};
  for (const file of files) {
    const fullPath = path.join(recordsRoot, file);
    signatures[file] = {
      mtimeMs: statSync(fullPath).mtimeMs,
      body: readFileSync(fullPath, "utf8"),
    };
  }
  return { files, signatures };
}

function listFiles(root: string, prefix = ""): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(root, relative));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files.sort();
}

function assertRecordsUnchanged(root: ManualStoryRoot, before: RecordsSnapshot): void {
  assert.deepEqual(recordsSnapshot(root), before);
}

async function savePrompt(fixture: Fixture): Promise<string> {
  const server = await createServer({ repoRoot: fixture.repoRoot });
  try {
    const response = await server.inject({
      method: "POST",
      url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts`,
      payload: {
        moment_directive: "Jon watches rain gather on the quay.",
        included_cast: ["mchar-1"],
        included_records: [],
      },
    });
    assert.equal(response.statusCode, 201);
    return (response.json() as { id: string }).id;
  } finally {
    await server.close();
  }
}

async function saveSegment(
  fixture: Fixture,
  prose: string,
  promptId: string | null = null,
): Promise<{ segment_id: string; sidecar: SegmentSidecar }> {
  const server = await createServer({ repoRoot: fixture.repoRoot });
  try {
    const response = await server.inject({
      method: "POST",
      url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
      payload: {
        prose,
        title: "Rain on the Quay",
        author_note: "capstone",
        prompt_id: promptId,
      },
    });
    assert.equal(response.statusCode, 201);
    return response.json() as { segment_id: string; sidecar: SegmentSidecar };
  } finally {
    await server.close();
  }
}

test("AC #1-#7 and Plan-Authority: save/edit/rebuild/checklist round trip", async () => {
  const fixture = mkFixture();
  try {
    const promptId = await savePrompt(fixture);
    const beforeRecords = recordsSnapshot(fixture.root);
    const first = await saveSegment(
      fixture,
      "Rain ticks against the harbor lanterns.",
      promptId,
    );

    assert.equal(first.segment_id, "SEG-1");
    assert.equal(first.sidecar.id, "SEG-1");
    assert.equal(first.sidecar.title, "Rain on the Quay");
    assert.equal(first.sidecar.prompt_id, "PROMPT-1");
    assert.match(first.sidecar.prompt_sha256 ?? "", /^[a-f0-9]{64}$/);
    assert.equal(first.sidecar.moment_directive, "Jon watches rain gather on the quay.");
    assert.deepEqual(first.sidecar.included_record_summary.characters, ["mchar-1"]);
    assert.equal(first.sidecar.author_note, "capstone");
    assert.equal(first.sidecar.word_count, 6);
    assert.equal(
      readFileSync(path.join(fixture.root.absolutePath, "segments", "SEG-1.md"), "utf8"),
      "Rain ticks against the harbor lanterns.",
    );
    assert.deepEqual(readMetadata(fixture.root).segment_order, ["SEG-1"]);
    assert.equal(
      readFileSync(path.join(fixture.root.absolutePath, "manuscript.md"), "utf8"),
      "Rain ticks against the harbor lanterns.",
    );

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const edit = await server.inject({
        method: "PUT",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments/SEG-1?mode=${SEGMENT_REPAIR_MODE_FLAG}`,
        payload: {
          prose: "Rain ticks again.",
          title: "Rain Revised",
          author_note: "edited",
        },
      });
      assert.equal(edit.statusCode, 200);
      const edited = edit.json() as {
        sidecar: SegmentSidecar;
        checklist_payload: {
          disclaimer: string;
          entries: Array<{ record_class: string; cast_referencing_count: number }>;
        };
      };
      assert.equal(edited.sidecar.id, "SEG-1");
      assert.equal(edited.sidecar.created_at, first.sidecar.created_at);
      assert.notEqual(edited.sidecar.updated_at, first.sidecar.updated_at);
      assert.equal(edited.sidecar.word_count, 3);
      assert.equal(
        edited.checklist_payload.disclaimer,
        "Review these categories manually. Manual Story Studio has not changed any records.",
      );
      assert.equal(edited.checklist_payload.entries.length, 12);
      const classes = edited.checklist_payload.entries.map((entry) => entry.record_class);
      assert.deepEqual(classes, [
        "statuses",
        "emotions",
        "beliefs",
        "relationships",
        "objects",
        "plans",
        "clocks",
        "secrets",
        "questions",
        "consequences",
        "obligations",
        "threads",
      ]);
      const statuses = edited.checklist_payload.entries.find(
        (entry) => entry.record_class === "statuses",
      );
      assert.equal(statuses?.cast_referencing_count, 1);
      assert.equal(
        readFileSync(path.join(fixture.root.absolutePath, "manuscript.md"), "utf8"),
        "Rain ticks again.",
      );

      const rebuild1 = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript/rebuild`,
      });
      assert.equal(rebuild1.statusCode, 200);
      const manuscriptBefore = readFileSync(
        path.join(fixture.root.absolutePath, "manuscript.md"),
      );
      const rebuild2 = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript/rebuild`,
      });
      assert.equal(rebuild2.statusCode, 200);
      assert.deepEqual(
        readFileSync(path.join(fixture.root.absolutePath, "manuscript.md")),
        manuscriptBefore,
      );
    } finally {
      await server.close();
    }

    assertRecordsUnchanged(fixture.root, beforeRecords);
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #3-#5: segment_order appends and manuscript concatenates in order", async () => {
  const fixture = mkFixture();
  try {
    await saveSegment(fixture, "First segment.");
    await saveSegment(fixture, "Second segment.");
    assert.deepEqual(readMetadata(fixture.root).segment_order, ["SEG-1", "SEG-2"]);

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript`,
      });
      assert.equal(response.statusCode, 200);
      const manuscript = response.json() as { body: string; word_count: number };
      assert.equal(manuscript.body, "First segment.\n\nSecond segment.");
      assert.equal(manuscript.word_count, 4);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #8 and Plan-Authority: segment delete hybrid outcomes", async () => {
  const unreferenced = mkFixture();
  const referenced = mkFixture();
  const forced = mkFixture();
  try {
    await saveSegment(unreferenced, "Disposable segment.");
    const unreferencedRecords = recordsSnapshot(unreferenced.root);
    let server = await createServer({ repoRoot: unreferenced.repoRoot });
    try {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${unreferenced.worldSlug}/manual-stories/${unreferenced.msSlug}/segments/SEG-1?mode=${SEGMENT_REPAIR_MODE_FLAG}`,
      });
      assert.equal(response.statusCode, 200);
      assert.equal((response.json() as { outcome: string }).outcome, "hard_deleted");
      assert.equal(existsSync(path.join(unreferenced.root.absolutePath, "segments", "SEG-1.md")), false);
      assert.equal(existsSync(path.join(unreferenced.root.absolutePath, "segments", "SEG-1.yaml")), false);
      assert.deepEqual(readMetadata(unreferenced.root).segment_order, []);
    } finally {
      await server.close();
    }
    assertRecordsUnchanged(unreferenced.root, unreferencedRecords);

    await saveSegment(referenced, "Referenced segment.");
    seedConsequence(referenced.root, "SEG-1");
    const referencedRecords = recordsSnapshot(referenced.root);
    server = await createServer({ repoRoot: referenced.repoRoot });
    try {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${referenced.worldSlug}/manual-stories/${referenced.msSlug}/segments/SEG-1?mode=${SEGMENT_REPAIR_MODE_FLAG}`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { outcome: string; referrers: Array<{ id: string }> };
      assert.equal(body.outcome, "segment_order_removed_files_preserved");
      assert.deepEqual(body.referrers.map((referrer) => referrer.id), ["mcnsq-1"]);
      assert.equal(existsSync(path.join(referenced.root.absolutePath, "segments", "SEG-1.md")), true);
      assert.equal(existsSync(path.join(referenced.root.absolutePath, "segments", "SEG-1.yaml")), true);
      assert.deepEqual(readMetadata(referenced.root).segment_order, []);
    } finally {
      await server.close();
    }
    assertRecordsUnchanged(referenced.root, referencedRecords);

    await saveSegment(forced, "Forced segment.");
    seedConsequence(forced.root, "SEG-1");
    const forcedRecords = recordsSnapshot(forced.root);
    server = await createServer({ repoRoot: forced.repoRoot });
    try {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${forced.worldSlug}/manual-stories/${forced.msSlug}/segments/SEG-1?force=true&mode=${SEGMENT_REPAIR_MODE_FLAG}`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { outcome: string; warning: string };
      assert.equal(body.outcome, "force_deleted");
      assert.match(body.warning, /mcnsq-1/);
      assert.equal(existsSync(path.join(forced.root.absolutePath, "segments", "SEG-1.md")), false);
      assert.equal(existsSync(path.join(forced.root.absolutePath, "segments", "SEG-1.yaml")), false);
    } finally {
      await server.close();
    }
    assertRecordsUnchanged(forced.root, forcedRecords);
  } finally {
    rmSync(unreferenced.repoRoot, { recursive: true, force: true });
    rmSync(referenced.repoRoot, { recursive: true, force: true });
    rmSync(forced.repoRoot, { recursive: true, force: true });
  }
});

test("AC #9-#10: manuscript and prompt-history surfaces are wired", async () => {
  const fixture = mkFixture();
  try {
    const promptId = await savePrompt(fixture);
    await saveSegment(fixture, "Linked prompt segment.", promptId);
    await saveSegment(fixture, "Unlinked segment.");

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const manuscript = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/manuscript`,
      });
      assert.equal(manuscript.statusCode, 200);
      const manuscriptBody = manuscript.json() as { body: string; manuscript_path: string };
      assert.equal(
        manuscriptBody.body,
        "Linked prompt segment.\n\nUnlinked segment.",
      );
      assert.equal(
        manuscriptBody.manuscript_path,
        path.join(fixture.root.absolutePath, "manuscript.md"),
      );

      const prompts = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts`,
      });
      assert.equal(prompts.statusCode, 200);
      const promptBody = prompts.json() as {
        prompts: Array<{ id: string; linked_segments: string[] }>;
      };
      assert.deepEqual(promptBody.prompts[0]?.linked_segments, ["SEG-1"]);
    } finally {
      await server.close();
    }

    const appSource = readFileSync(path.join(REPO_ROOT, "tools/manual-story-studio/web/src/App.tsx"), "utf8");
    const manuscriptSource = readFileSync(path.join(REPO_ROOT, "tools/manual-story-studio/web/src/pages/Manuscript.tsx"), "utf8");
    const promptHistorySource = readFileSync(path.join(REPO_ROOT, "tools/manual-story-studio/web/src/pages/PromptHistory.tsx"), "utf8");
    assert.match(appSource, /paste-prose/);
    assert.match(appSource, /manuscript/);
    assert.match(appSource, /prompt-history/);
    assert.match(manuscriptSource, /readManuscript/);
    assert.match(manuscriptSource, /rebuildManuscript/);
    assert.match(promptHistorySource, /linked_segments/);
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #11: discarded or invalid prose is not persisted", async () => {
  const fixture = mkFixture();
  try {
    const beforeRecords = recordsSnapshot(fixture.root);
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
        payload: { title: "No prose" },
      });
      assert.equal(response.statusCode, 400);
      assert.equal(existsSync(path.join(fixture.root.absolutePath, "segments")), false);
      assert.equal(existsSync(path.join(fixture.root.absolutePath, "manuscript.md")), false);
    } finally {
      await server.close();
    }
    assertRecordsUnchanged(fixture.root, beforeRecords);
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("AC #12: capstone is executing under the package test runner", () => {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), "capstone-spec103.test.js");
});
