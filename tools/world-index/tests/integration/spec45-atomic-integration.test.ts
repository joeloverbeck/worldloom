import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import YAML from "yaml";

import { build } from "../../src/commands/build.js";
import { cleanup, createAtomicRepoRoot } from "../helpers/atomic-fixture.js";

const WORLD_SLUG = "atomic-world";
const STORY_SLUG = "spec45-provenance";

interface EdgeSummary {
  source_node_id: string;
  target_node_id: string | null;
  target_unresolved_ref: string | null;
  edge_type: string;
}

interface ExpectedCounts {
  state_delta_create: number;
  state_delta_supersede: number;
  creation_evidence: number;
}

function storyNode(recordId: string): string {
  return `${STORY_SLUG}:${recordId}`;
}

function writeStoryRecord(root: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function addSyntheticProvenanceStory(root: string): void {
  writeStoryRecord(root, "pages", "PG-1.yaml", [
    "id: PG-1",
    "story_id: STORY-45",
    "branch_id: BR-1",
    "parent_page_id: null",
    "branch_path: [PG-1]",
    "state_snapshot:",
    "  objective_facts: [SF-1]"
  ]);
  writeStoryRecord(root, "beliefs", "BEL-1.yaml", [
    "id: BEL-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "holder: STENT-1",
    "claim: The fixture bell matters.",
    "belief_mode: believes",
    "truth_relation: true",
    "confidence: high",
    "visibility: shared"
  ]);
  writeStoryRecord(root, "facts", "SF-1.yaml", [
    "id: SF-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "subject: STENT-1",
    "predicate: notices",
    "object: the bell",
    "epistemic_class: objective",
    "truth_value: true"
  ]);
  writeStoryRecord(root, "entities", "STENT-1.yaml", [
    "id: STENT-1",
    "story_id: STORY-45",
    "name: Bell Keeper",
    "role_in_story: [primary_actor]",
    "present_at_start: true",
    "story_only: true"
  ]);
  writeStoryRecord(root, "clocks", "CLK-1.yaml", [
    "id: CLK-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "title: Bell Clock",
    "clock_kind: danger",
    "driver: STENT-1",
    "value: 1",
    "max: 6",
    "status: active"
  ]);
  writeStoryRecord(root, "secrets", "STSEC-1.yaml", [
    "id: STSEC-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "secret_claim: The bell is hidden.",
    "visibility:",
    "  scope: hidden_from_viewpoint",
    "status: unrevealed"
  ]);
  writeStoryRecord(root, "story-questions", "STQ-1.yaml", [
    "id: STQ-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "question_or_setup: Who rings the bell?",
    "status: open"
  ]);
  writeStoryRecord(root, "threads", "THR-1.yaml", [
    "id: THR-1",
    "story_id: STORY-45",
    "type: mystery",
    "status: active",
    "title: Bell thread",
    "obligations: []"
  ]);
  writeStoryRecord(root, "events", "SE-1.yaml", [
    "id: SE-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "event_kind: story_start",
    "actor: system",
    "commitment:",
    "  selected_slt_id: null",
    "  selection_source: none",
    "world_logic_rationale: >-",
    "  Structured introductions are represented by record_introductions.",
    "record_introductions:",
    "  - record_id: CLK-1",
    "    class: CLK",
    "    trigger: deadline_declared",
    "    evidence: [PG-1, SF-1]",
    "    distinct_from: []",
    "  - record_id: STSEC-1",
    "    class: STSEC",
    "    trigger: clue_carrier_enters_play",
    "    evidence: [PG-1, BEL-1]",
    "    distinct_from: []",
    "  - record_id: STQ-1",
    "    class: STQ",
    "    trigger: promise_made",
    "    evidence: [BEL-1, SF-1]",
    "    distinct_from: []",
    "  - record_id: THR-1",
    "    class: THR",
    "    trigger: new_ongoing_causal_concern",
    "    evidence: [PG-1, BEL-1]",
    "    distinct_from: []",
    "state_delta:",
    "  create: [CLK-1, STSEC-1, STQ-1]",
    "  supersede: [THR-1, STENT-1]",
    "  close: []"
  ]);
  writeStoryRecord(root, "events", "SE-2.yaml", [
    "id: SE-2",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "event_kind: selected_choice",
    "actor: STENT-1",
    "commitment:",
    "  selected_slt_id: null",
    "  selection_source: none",
    "world_logic_rationale: No structured intro tags here.",
    "state_delta:",
    "  create: []",
    "  supersede: [CLK-1]",
    "  close: []"
  ]);
}

function edgeRows(root: string, worldSlug: string, storySlug: string): EdgeSummary[] {
  const db = new Database(path.join(root, "worlds", worldSlug, "_index", "world.db"), { readonly: true });

  try {
    return db
      .prepare(
        `
          SELECT source_node_id, target_node_id, target_unresolved_ref, edge_type
          FROM edges
          WHERE story_slug = ?
            AND edge_type IN ('state_delta_create', 'state_delta_supersede', 'creation_evidence')
          ORDER BY edge_type, source_node_id, target_node_id, target_unresolved_ref
        `
      )
      .all(storySlug) as EdgeSummary[];
  } finally {
    db.close();
  }
}

function countRows(rows: EdgeSummary[]): ExpectedCounts {
  return {
    state_delta_create: rows.filter((row) => row.edge_type === "state_delta_create").length,
    state_delta_supersede: rows.filter((row) => row.edge_type === "state_delta_supersede").length,
    creation_evidence: rows.filter((row) => row.edge_type === "creation_evidence").length
  };
}

function expectedCountsFromEvents(sourceRoot: string): ExpectedCounts {
  const eventsDirectory = path.join(sourceRoot, "events");
  const counts: ExpectedCounts = {
    state_delta_create: 0,
    state_delta_supersede: 0,
    creation_evidence: 0
  };

  const eventFiles = readdirSync(eventsDirectory)
    .filter((fileName) => /^SE-\d+\.yaml$/.test(fileName))
    .sort((left, right) => left.localeCompare(right, "en-US", { numeric: true }));

  for (const fileName of eventFiles) {
    const parsed = YAML.parse(readFileSync(path.join(eventsDirectory, fileName), "utf8")) as {
      state_delta?: { create?: unknown[]; supersede?: unknown[] };
      record_introductions?: Array<{ evidence?: unknown[] }>;
    };
    counts.state_delta_create += parsed.state_delta?.create?.length ?? 0;
    counts.state_delta_supersede += parsed.state_delta?.supersede?.length ?? 0;
    counts.creation_evidence += (parsed.record_introductions ?? []).reduce(
      (sum, introduction) => sum + (Array.isArray(introduction.evidence) ? introduction.evidence.length : 0),
      0
    );
  }

  return counts;
}

test("SPEC-45 world-index capstone builds synthetic story provenance edges", () => {
  const root = createAtomicRepoRoot(WORLD_SLUG);

  try {
    addSyntheticProvenanceStory(root);

    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);

    const rows = edgeRows(root, WORLD_SLUG, STORY_SLUG);
    assert.deepEqual(countRows(rows), {
      state_delta_create: 3,
      state_delta_supersede: 3,
      creation_evidence: 8
    });
    assert.ok(
      rows.some(
        (row) =>
          row.source_node_id === storyNode("SE-1") &&
          row.target_node_id === storyNode("CLK-1") &&
          row.edge_type === "state_delta_create"
      )
    );
    assert.ok(
      rows.some(
        (row) =>
          row.source_node_id === storyNode("CLK-1") &&
          row.target_node_id === storyNode("SF-1") &&
          row.edge_type === "creation_evidence"
      )
    );
  } finally {
    cleanup(root);
  }
});

test("SPEC-45 world-index capstone rebuilds a story temp copy without mutating source files", () => {
  const sourceRoot = createAtomicRepoRoot(WORLD_SLUG);
  const copiedRoot = mkdtempSync(path.join(os.tmpdir(), "world-index-spec45-copy-"));

  try {
    addSyntheticProvenanceStory(sourceRoot);

    const sourceWorld = path.join(sourceRoot, "worlds", WORLD_SLUG);
    const copiedWorld = path.join(copiedRoot, "worlds", WORLD_SLUG);
    mkdirSync(path.dirname(copiedWorld), { recursive: true });
    cpSync(sourceWorld, copiedWorld, { recursive: true });
    rmSync(path.join(copiedWorld, "_index"), { recursive: true, force: true });

    const copiedSe1 = path.join(copiedWorld, "stories", STORY_SLUG, "_source", "events", "SE-1.yaml");
    const before = statSync(copiedSe1).mtimeMs;
    const expected = expectedCountsFromEvents(path.join(copiedWorld, "stories", STORY_SLUG, "_source"));

    assert.equal(build(copiedRoot, WORLD_SLUG, { quiet: true }), 0);
    assert.deepEqual(countRows(edgeRows(copiedRoot, WORLD_SLUG, STORY_SLUG)), expected);
    assert.equal(statSync(copiedSe1).mtimeMs, before);
  } finally {
    cleanup(sourceRoot);
    rmSync(copiedRoot, { recursive: true, force: true });
  }
});
