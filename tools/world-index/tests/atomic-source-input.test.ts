import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { build } from "../src/commands/build";

function createAtomicRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-atomic-"));
  const world = path.join(root, "worlds", "atomic-world");
  mkdirSync(world, { recursive: true });

  writeFileSync(path.join(world, "WORLD_KERNEL.md"), "# Atomic Fixture\n", "utf8");
  writeFileSync(
    path.join(world, "ONTOLOGY.md"),
    [
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
      "Entity registry records live under `_source/entities/`."
    ].join("\n"),
    "utf8"
  );

  writeAtomic(world, "canon", "CF-0001.yaml", [
    "id: CF-0001",
    "title: Brinewick keeps salt wardens",
    "status: hard_canon",
    "type: institution",
    "statement: Brinewick maintains a public corps of salt wardens.",
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
    "modification_history:",
    "  - change_id: CH-0001",
    "    originating_cf: CF-0001",
    "    date: 2026-04-22",
    "    summary: Clarified the wardens' civic role."
  ]);
  writeAtomic(world, "change-log", "CH-0001.yaml", [
    "change_id: CH-0001",
    "date: 2026-04-22",
    "change_type: clarification",
    "affected_fact_ids: [CF-0001]",
    "summary: Clarified the wardens' civic role.",
    "reason: [Keep the fixture world coherent.]",
    "scope:",
    "  local_or_global: local",
    "  changes_ordinary_life: true",
    "  creates_new_story_engines: false",
    "  mystery_reserve_effect: unchanged",
    "downstream_updates: [INSTITUTIONS]",
    "impact_on_existing_texts: [Updated the institutions note.]",
    "severity_before_fix: 1",
    "severity_after_fix: 0",
    "retcon_policy_checks:",
    "  no_silent_edit: true",
    "  replacement_noted: true",
    "  no_stealth_diegetic_rewrite: true",
    "  net_contradictions_not_increased: true",
    "  world_identity_preserved: true",
    "originating_cf: CF-0001"
  ]);
  writeAtomic(world, "invariants", "ONT-1.yaml", [
    "id: ONT-1",
    "category: ontological",
    "title: Institutions are embodied.",
    "statement: Institutions require embodied members.",
    "rationale: Keeps social power material.",
    "examples: [Salt wardens]",
    "non_examples: [Disembodied offices]",
    "break_conditions: User-approved retcon.",
    "revision_difficulty: high"
  ]);
  writeAtomic(world, "mystery-reserve", "M-1.yaml", [
    "id: M-1",
    "title: The old bell",
    "status: active",
    "knowns: [The bell exists.]",
    "unknowns: [Who cast it.]",
    "common_interpretations: []",
    "disallowed_cheap_answers: [It was secretly CF-0001 all along.]",
    "domains_touched: [institutions]",
    "future_resolution_safety: medium",
    "firewall_for: [CF-0001]"
  ]);
  writeAtomic(world, "open-questions", "OQ-0001.yaml", [
    "id: OQ-0001",
    "topic: Harbor bells",
    "body: How many bells does Brinewick keep?",
    "when_to_resolve: When a local scene needs it."
  ]);
  writeAtomic(world, "entities", "ENT-0001.yaml", [
    "id: ENT-0001",
    "canonical_name: Brinewick",
    "entity_kind: place",
    "aliases: [Salt Harbor]",
    "originating_cf: null",
    "scope_notes: Local harbor settlement."
  ]);
  writeAtomic(world, "institutions", "SEC-INS-001.yaml", [
    "id: SEC-INS-001",
    "file_class: INSTITUTIONS",
    "order: 1",
    "heading: Salt Wardens",
    "heading_level: 2",
    "body: Brinewick wardens keep the public salt measures.",
    "touched_by_cf: [CF-0001]"
  ]);

  return root;
}

function createLegacyRepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-legacy-"));
  const source = path.resolve(__dirname, "..", "..", "tests", "fixtures", "fixture-world");
  const target = path.join(root, "worlds", "fixture-world");
  cpSync(source, target, { recursive: true });
  return root;
}

function writeAtomic(world: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(world, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

test("build reads SPEC-13 atomic source records without retired root markdown files", () => {
  const root = createAtomicRepoRoot();

  try {
    assert.equal(build(root, "atomic-world"), 0);

    const db = new Database(path.join(root, "worlds", "atomic-world", "_index", "world.db"), {
      readonly: true
    });
    try {
      const nodeRows = db
        .prepare(
          `
            SELECT node_id, node_type
            FROM nodes
            WHERE node_id IN (
              'CF-0001',
              'CH-0001',
              'ONT-1',
              'M-1',
              'OQ-0001',
              'ENT-0001',
              'SEC-INS-001',
              'entity:brinewick',
              'atomic-world:INSTITUTIONS.md:__file__'
            )
            ORDER BY node_id
          `
        )
        .all() as Array<{ node_id: string; node_type: string }>;

      assert.deepEqual(nodeRows, [
        { node_id: "CF-0001", node_type: "canon_fact_record" },
        { node_id: "CH-0001", node_type: "change_log_entry" },
        { node_id: "ENT-0001", node_type: "named_entity" },
        { node_id: "M-1", node_type: "mystery_reserve_entry" },
        { node_id: "ONT-1", node_type: "invariant" },
        { node_id: "OQ-0001", node_type: "open_question_entry" },
        { node_id: "SEC-INS-001", node_type: "section" },
        { node_id: "atomic-world:INSTITUTIONS.md:__file__", node_type: "domain_file" },
        { node_id: "entity:brinewick", node_type: "named_entity" }
      ]);

      const requiredWorldUpdate = db
        .prepare(
          `
            SELECT target_node_id, target_unresolved_ref
            FROM edges
            WHERE source_node_id = 'CF-0001'
              AND edge_type = 'required_world_update'
          `
        )
        .get() as { target_node_id: string | null; target_unresolved_ref: string | null };
      assert.deepEqual(requiredWorldUpdate, {
        target_node_id: "atomic-world:INSTITUTIONS.md:__file__",
        target_unresolved_ref: null
      });

      const touchedBy = db
        .prepare(
          `
            SELECT target_node_id, target_unresolved_ref
            FROM edges
            WHERE source_node_id = 'SEC-INS-001'
              AND edge_type = 'patched_by'
          `
        )
        .get() as { target_node_id: string | null; target_unresolved_ref: string | null };
      assert.deepEqual(touchedBy, {
        target_node_id: "CF-0001",
        target_unresolved_ref: null
      });
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("legacy fixture still uses markdown when _source has no recognized atomic YAML records", () => {
  const root = createLegacyRepoRoot();

  try {
    assert.equal(build(root, "fixture-world"), 0);

    const db = new Database(path.join(root, "worlds", "fixture-world", "_index", "world.db"), {
      readonly: true
    });
    try {
      const cfRow = db
        .prepare("SELECT node_id, file_path, node_type FROM nodes WHERE node_id = 'CF-0001'")
        .get() as { node_id: string; file_path: string; node_type: string };
      assert.deepEqual(cfRow, {
        node_id: "CF-0001",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record"
      });

      const rawSourceRows = db
        .prepare("SELECT COUNT(*) AS count FROM nodes WHERE file_path LIKE '_source/%'")
        .get() as { count: number };
      assert.equal(rawSourceRows.count, 0);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});
