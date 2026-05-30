import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { build } from "../src/commands/build.js";
import { sync } from "../src/commands/sync.js";
import { verify } from "../src/commands/verify.js";
import { normalizeProseWhitespace, sha256Hex } from "../src/hash/content.js";

const ATOMIC_FIXTURE_FILES: Array<{ relativePath: string; lines: string[] }> = [
  {
    relativePath: "WORLD_KERNEL.md",
    lines: ["# STCHAR Sync Fixture"]
  },
  {
    relativePath: "ONTOLOGY.md",
    lines: [
      "# Ontology",
      "",
      "## Categories in Use",
      "",
      "- institution",
      "",
      "## Relation Types in Use",
      "",
      "- governs",
      "",
      "## Notes on Use",
      "",
      "Story-local character authority lives under `stories/<slug>/story-characters/`."
    ]
  },
  {
    relativePath: "_source/canon/CF-1.yaml",
    lines: [
      "id: CF-1",
      "title: Salt wardens keep the gate",
      "status: hard_canon",
      "type: institution",
      "statement: The wardens enforce gate watch.",
      "scope:",
      "  geographic: local",
      "  temporal: current",
      "  social: public",
      "truth_scope:",
      "  world_level: true",
      "  diegetic_status: objective",
      "domains_affected: [institutions]",
      "required_world_updates: [INSTITUTIONS]",
      "source_basis:",
      "  direct_user_approval: true",
      "modification_history: []"
    ]
  },
  {
    relativePath: "_source/change-log/CH-1.yaml",
    lines: [
      "change_id: CH-1",
      "date: 2026-05-30",
      "change_type: clarification",
      "affected_fact_ids: [CF-1]",
      "summary: Initial wardens entry.",
      "reason: [Establish coverage.]",
      "scope:",
      "  local_or_global: local",
      "  changes_ordinary_life: false",
      "  creates_new_story_engines: false",
      "  mystery_reserve_effect: unchanged",
      "downstream_updates: []",
      "impact_on_existing_texts: []",
      "severity_before_fix: 0",
      "severity_after_fix: 0",
      "retcon_policy_checks:",
      "  no_silent_edit: true",
      "  replacement_noted: true",
      "  no_stealth_diegetic_rewrite: true",
      "  net_contradictions_not_increased: true",
      "  world_identity_preserved: true",
      "originating_cf: CF-1"
    ]
  },
  {
    relativePath: "_source/invariants/ONT-1.yaml",
    lines: [
      "id: ONT-1",
      "category: ontological",
      "title: Institutions are embodied.",
      "statement: Institutions require embodied members.",
      "rationale: Keeps social power material.",
      "examples: []",
      "non_examples: []",
      "break_conditions: User-approved retcon.",
      "revision_difficulty: high"
    ]
  },
  {
    relativePath: "_source/mystery-reserve/M-1.yaml",
    lines: [
      "id: M-1",
      "title: The old gate key",
      "status: active",
      "knowns: []",
      "unknowns: []",
      "common_interpretations: []",
      "disallowed_cheap_answers: []",
      "domains_touched: [institutions]",
      "future_resolution_safety: medium",
      "firewall_for: [CF-1]"
    ]
  },
  {
    relativePath: "_source/open-questions/OQ-1.yaml",
    lines: [
      "id: OQ-1",
      "topic: Gate watch",
      "body: Who relieves the watch at midnight?",
      "when_to_resolve: When a scene needs it."
    ]
  }
];

const STCHAR_BODY_VERSION_A = [
  "---",
  "id: STCHAR-1",
  "story_id: STORY-1",
  "story_slug: gatewatch",
  "world_slug: stchar-sync-world",
  "source_kind: world_char",
  "source_char_id: CHAR-1",
  `source_char_hash: sha256:${"a".repeat(64)}`,
  "source_char_sections_used: [frontmatter]",
  "generated_at_page: story_bootstrap",
  "created_by_skill: branching-story-bootstrap",
  "supersedes: null",
  "superseded_by: null",
  "status: active",
  "bound_stent_ids: [STENT-1]",
  "profile_revision: 1",
  "body_schema_version: stchar.v1",
  `profile_hash: sha256:${"b".repeat(64)}`,
  `voice_block_hash: sha256:${"c".repeat(64)}`,
  "---",
  "## Profile",
  "",
  "Marla Kern walks the gate watch quietly.",
  "",
  "## Page-Plan Voice Block",
  "",
  "Use clipped, observant phrasing.",
  ""
].join("\n");

const STCHAR_BODY_VERSION_B = [
  "---",
  "id: STCHAR-1",
  "story_id: STORY-1",
  "story_slug: gatewatch",
  "world_slug: stchar-sync-world",
  "source_kind: world_char",
  "source_char_id: CHAR-1",
  `source_char_hash: sha256:${"a".repeat(64)}`,
  "source_char_sections_used: [frontmatter]",
  "generated_at_page: story_bootstrap",
  "created_by_skill: branching-story-bootstrap",
  "supersedes: null",
  "superseded_by: null",
  "status: active",
  "bound_stent_ids: [STENT-1]",
  "profile_revision: 2",
  "body_schema_version: stchar.v1",
  `profile_hash: sha256:${"d".repeat(64)}`,
  `voice_block_hash: sha256:${"e".repeat(64)}`,
  "---",
  "## Profile",
  "",
  "Marla Kern walks the gate watch deliberately, listening for the bell.",
  "",
  "## Page-Plan Voice Block",
  "",
  "Use clipped, observant phrasing with an attentive cadence.",
  ""
].join("\n");

function createWorld(slug: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-stchar-sync-"));
  mkdirSync(path.join(root, "docs"), { recursive: true });
  writeFileSync(path.join(root, "docs", "FOUNDATIONS.md"), "# Foundations\n", "utf8");
  const world = path.join(root, "worlds", slug);
  mkdirSync(world, { recursive: true });

  for (const file of ATOMIC_FIXTURE_FILES) {
    const target = path.join(world, file.relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, `${file.lines.join("\n")}\n`, "utf8");
  }

  const stentDirectory = path.join(world, "stories", "gatewatch", "_source", "entities");
  mkdirSync(stentDirectory, { recursive: true });
  writeFileSync(
    path.join(stentDirectory, "STENT-1.yaml"),
    [
      "id: STENT-1",
      "story_id: STORY-1",
      "world_ent_id: null",
      "character_id: null",
      "name: Marla Kern",
      "display_name: Marla Kern",
      "bound_stchar_id: STCHAR-1",
      "role_in_story: [primary_actor]",
      "present_at_start: true",
      "story_only: false",
      "created_at_page: PG-1",
      "notes: Story-local watcher."
    ].join("\n") + "\n",
    "utf8"
  );

  const stcharDirectory = path.join(world, "stories", "gatewatch", "story-characters");
  mkdirSync(stcharDirectory, { recursive: true });
  writeFileSync(path.join(stcharDirectory, "STCHAR-1.md"), STCHAR_BODY_VERSION_A, "utf8");

  return root;
}

function readIndexedStcharContentHash(worldRoot: string, slug: string): {
  fileHash: string;
  nodeHash: string;
} {
  const dbPath = path.join(worldRoot, "worlds", slug, "_index", "world.db");
  const db = new Database(dbPath, { readonly: true });
  try {
    const fileRow = db
      .prepare(
        "SELECT content_hash FROM file_versions WHERE world_slug = ? AND file_path = ?"
      )
      .get(slug, "stories/gatewatch/story-characters/STCHAR-1.md") as
      | { content_hash: string }
      | undefined;
    const nodeRow = db
      .prepare("SELECT content_hash FROM nodes WHERE node_id = 'gatewatch:STCHAR-1'")
      .get() as { content_hash: string } | undefined;
    assert.ok(fileRow, "expected file_versions row for STCHAR hybrid path");
    assert.ok(nodeRow, "expected nodes row for gatewatch:STCHAR-1");
    return { fileHash: fileRow.content_hash, nodeHash: nodeRow.content_hash };
  } finally {
    db.close();
  }
}

function readDriftCheckRows(
  worldRoot: string,
  slug: string
): Array<{ severity: string; code: string; message: string; node_id: string | null; file_path: string | null }> {
  const dbPath = path.join(worldRoot, "worlds", slug, "_index", "world.db");
  const db = new Database(dbPath, { readonly: true });
  try {
    return db
      .prepare(
        `
          SELECT severity, code, message, node_id, file_path
          FROM validation_results
          WHERE world_slug = ?
            AND validator_name = 'drift_check'
          ORDER BY result_id
        `
      )
      .all(slug) as Array<{
      severity: string;
      code: string;
      message: string;
      node_id: string | null;
      file_path: string | null;
    }>;
  } finally {
    db.close();
  }
}

test("incremental sync reconciles content_hash for an updated STCHAR hybrid file", () => {
  const worldSlug = "stchar-sync-world";
  const root = createWorld(worldSlug);

  try {
    const buildExit = build(root, worldSlug);
    assert.equal(buildExit, 0);

    const initialFileHash = sha256Hex(STCHAR_BODY_VERSION_A);
    const initialNodeHash = sha256Hex(normalizeProseWhitespace(STCHAR_BODY_VERSION_A));
    const baseline = readIndexedStcharContentHash(root, worldSlug);
    assert.equal(baseline.fileHash, initialFileHash);
    assert.equal(baseline.nodeHash, initialNodeHash);

    const stcharFilePath = path.join(
      root,
      "worlds",
      worldSlug,
      "stories",
      "gatewatch",
      "story-characters",
      "STCHAR-1.md"
    );
    writeFileSync(stcharFilePath, STCHAR_BODY_VERSION_B, "utf8");

    const updatedFileHash = sha256Hex(STCHAR_BODY_VERSION_B);
    const updatedNodeHash = sha256Hex(normalizeProseWhitespace(STCHAR_BODY_VERSION_B));
    assert.notEqual(updatedFileHash, initialFileHash);
    assert.notEqual(updatedNodeHash, initialNodeHash);

    const syncExit = sync(root, worldSlug, { quiet: true });
    assert.equal(syncExit, 0);

    const post = readIndexedStcharContentHash(root, worldSlug);
    assert.equal(
      post.fileHash,
      updatedFileHash,
      "file_versions content_hash must match the post-rewrite raw-bytes STCHAR file hash"
    );
    assert.equal(
      post.nodeHash,
      updatedNodeHash,
      "nodes content_hash for the STCHAR record must match the post-rewrite normalized-prose hash"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("verify uses the STCHAR hybrid parser and emits zero false-fail drift entries for unchanged files", () => {
  const worldSlug = "stchar-verify-world";
  const root = createWorld(worldSlug);

  try {
    const buildExit = build(root, worldSlug);
    assert.equal(buildExit, 0);

    const verifyExit = verify(root, worldSlug);
    assert.equal(
      verifyExit,
      0,
      "verify must return 0 for an unchanged STCHAR hybrid file when the correct parser is used"
    );

    const driftRows = readDriftCheckRows(root, worldSlug);
    const stcharRows = driftRows.filter(
      (row) =>
        (row.file_path !== null && row.file_path.includes("story-characters/")) ||
        (row.node_id !== null && row.node_id.includes("STCHAR-"))
    );
    assert.deepEqual(
      stcharRows,
      [],
      "verify must not emit any drift_check rows scoped to healthy STCHAR hybrid files"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("verify still reports genuine content_hash drift on a tampered STCHAR hybrid file", () => {
  const worldSlug = "stchar-real-drift-world";
  const root = createWorld(worldSlug);

  try {
    const buildExit = build(root, worldSlug);
    assert.equal(buildExit, 0);

    const stcharFilePath = path.join(
      root,
      "worlds",
      worldSlug,
      "stories",
      "gatewatch",
      "story-characters",
      "STCHAR-1.md"
    );
    const initialContent = readFileSync(stcharFilePath, "utf8");
    writeFileSync(stcharFilePath, `${initialContent}\nAppended drift line.\n`, "utf8");

    const verifyExit = verify(root, worldSlug);
    assert.equal(
      verifyExit,
      1,
      "verify must return non-zero exit when a real STCHAR drift exists"
    );

    const driftRows = readDriftCheckRows(root, worldSlug);
    const stcharDrift = driftRows.find(
      (row) =>
        row.severity === "fail" &&
        row.code === "content_hash_drift" &&
        row.file_path === "stories/gatewatch/story-characters/STCHAR-1.md"
    );
    assert.ok(
      stcharDrift,
      "verify must still emit a fail-severity content_hash_drift row for the tampered STCHAR file"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
