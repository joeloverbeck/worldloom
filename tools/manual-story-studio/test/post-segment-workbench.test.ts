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

import { createServer } from "../src/server/http.js";
import type { SegmentSidecar } from "../src/schema/manual-story.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../src/write/sandbox.js";

const LEGACY_REVIEW_KEY = ["last", "reviewed", "after", "segment"].join("_");
const CHECKLIST_PAYLOAD_KEY = ["checklist", "payload"].join("_");
const STATE_DELTA_KEY = ["state", "delta"].join("_");
const INFERRED_CHANGES_KEY = ["inferred", "changes"].join("_");

function mkWorld(): {
  repoRoot: string;
  worldSlug: string;
  msSlug: string;
  root: ManualStoryRoot;
} {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-workbench-"));
  const worldSlug = "test-world";
  const msSlug = "test-story";
  mkdirSync(path.join(repoRoot, "worlds", worldSlug), { recursive: true });
  const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
  mkdirSync(root.absolutePath, { recursive: true });
  return { repoRoot, worldSlug, msSlug, root };
}

function route(worldSlug: string, msSlug: string, segmentId: string): string {
  return `/api/worlds/${worldSlug}/manual-stories/${msSlug}/segments/${segmentId}/post-segment-workbench`;
}

function commonRecord(id: string, title: string): Record<string, unknown> {
  return {
    id,
    title,
    active: true,
    importance: "medium",
    tags: [],
    summary: "",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    notes: "",
  };
}

function writeRecord(
  root: ManualStoryRoot,
  relativePath: string,
  record: Record<string, unknown>,
): void {
  safeWriteFile(root, relativePath, YAML.stringify(record));
}

function writeWorkbenchFixture(root: ManualStoryRoot): {
  segmentYamlPath: string;
  beliefYamlPath: string;
} {
  const sidecar: SegmentSidecar = {
    id: "SEG-1",
    created_at: "2026-06-03T00:00:00.000Z",
    updated_at: "2026-06-03T00:00:00.000Z",
    title: "Riverhouse interruption",
    prompt_id: "PROMPT-1",
    prompt_sha256: "abc123",
    moment_directive: "Let Mara decide what to reveal.",
    selected_template: null,
    included_record_summary: {
      characters: ["mchar-1"],
      records: ["mfact-1"],
    },
    author_note: "",
    word_count: 14,
  };
  safeWriteFile(
    root,
    path.join("segments", "SEG-1.md"),
    "Mara waits in the riverhouse kitchen.\n\nIven arrives with rain on his coat.",
  );
  safeWriteFile(root, path.join("segments", "SEG-1.yaml"), YAML.stringify(sidecar));

  writeRecord(root, path.join("records", "cast", "mchar-1.yaml"), {
    ...commonRecord("mchar-1", "Mara"),
    display_name: "Mara",
  });
  writeRecord(root, path.join("records", "facts", "mfact-1.yaml"), {
    ...commonRecord("mfact-1", "Debt fact"),
  });
  writeRecord(root, path.join("records", "beliefs", "mbel-1.yaml"), {
    ...commonRecord("mbel-1", "Mara knows the debt is due"),
    holder: "mchar-1",
    truth_relation: "true",
    confidence: "high",
  });
  writeRecord(root, path.join("records", "facts", "mfact-2.yaml"), {
    ...commonRecord("mfact-2", "Narrow scan control"),
    refs: { characters: ["mchar-1"], locations: [], related_records: [] },
  });

  return {
    segmentYamlPath: path.join(root.absolutePath, "segments", "SEG-1.yaml"),
    beliefYamlPath: path.join(root.absolutePath, "records", "beliefs", "mbel-1.yaml"),
  };
}

test("post-segment workbench route returns segment context and broad referrer candidates", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const { segmentYamlPath, beliefYamlPath } = writeWorkbenchFixture(root);
    const segmentYamlBefore = readFileSync(segmentYamlPath, "utf8");
    const beliefYamlBefore = readFileSync(beliefYamlPath, "utf8");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: route(worldSlug, msSlug, "SEG-1"),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        segment: {
          id: string;
          body: string;
          title: string;
          prompt_id: string | null;
          moment_directive: string;
          word_count: number;
          last_paragraph: string;
          included_record_summary: { characters: string[]; records: string[] };
        };
        reminder: string;
        touched_records: Array<{
          recordClass: string;
          id: string;
          title: string;
          active: boolean;
          target_ids: string[];
          fields: string[];
        }>;
      };

      assert.equal(body.segment.id, "SEG-1");
      assert.equal(body.segment.title, "Riverhouse interruption");
      assert.equal(body.segment.prompt_id, "PROMPT-1");
      assert.equal(body.segment.moment_directive, "Let Mara decide what to reveal.");
      assert.equal(body.segment.word_count, 14);
      assert.equal(body.segment.last_paragraph, "Iven arrives with rain on his coat.");
      assert.deepEqual(body.segment.included_record_summary.characters, ["mchar-1"]);
      assert.deepEqual(body.segment.included_record_summary.records, ["mfact-1"]);
      assert.match(body.segment.body, /riverhouse kitchen/);
      assert.match(body.reminder, /did not infer record changes/);

      const holderCandidate = body.touched_records.find((entry) => entry.id === "mbel-1");
      assert.deepEqual(holderCandidate, {
        recordClass: "beliefs",
        id: "mbel-1",
        title: "Mara knows the debt is due",
        active: true,
        target_ids: ["mchar-1"],
        fields: ["holder"],
      });
      assert.equal(
        holderCandidate?.fields.includes("refs.characters[0]"),
        false,
        "holder-linked candidate proves the broad scanner was used; a narrow refs.characters-only scan would miss this record",
      );

      const serialized = JSON.stringify(body);
      assert.equal(serialized.includes(LEGACY_REVIEW_KEY), false);
      assert.equal(Object.hasOwn(body as Record<string, unknown>, CHECKLIST_PAYLOAD_KEY), false);
      assert.equal(Object.hasOwn(body as Record<string, unknown>, STATE_DELTA_KEY), false);
      assert.equal(Object.hasOwn(body as Record<string, unknown>, INFERRED_CHANGES_KEY), false);
      assert.equal(readFileSync(segmentYamlPath, "utf8"), segmentYamlBefore);
      assert.equal(readFileSync(beliefYamlPath, "utf8"), beliefYamlBefore);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("post-segment workbench route rejects malformed segment ids", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: route(worldSlug, msSlug, "BAD"),
      });

      assert.equal(response.statusCode, 400);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
