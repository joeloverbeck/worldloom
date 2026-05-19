import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseStoryBundleSourceFile } from "../../src/parse/atomic.js";

test("PG records emit active-record, visible-affordance, and emitted-choice edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-page-edges-"));

  try {
    writeStoryRecord(root, "harborwatch", "pages", "PG-4", [
      "id: PG-4",
      "story_id: STORY-50",
      "branch_id: BR-1",
      "parent_page_id: PG-3",
      "branch_path: [PG-1, PG-4]",
      "turn_index: 4",
      "input:",
      "  choice_id: CHC-1",
      "  manual_action_text: null",
      "  resolved_event_id: SE-4",
      "state_hash_parent: null",
      "state_hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "state_snapshot:",
      "  canon_revision: CH-1",
      "  active_records:",
      "    STENT: [STENT-1]",
      "    STSTAT:",
      "      - STSTAT-1",
      "    STPLAN: [STPLAN-2]",
      "    STEMO: [STEMO-1]",
      "  visible_affordances:",
      "    - ordinal: 1",
      "      label: Harbor gate",
      "      grounded_in:",
      "        - STLOC-1",
      "        - STOBJ-1",
      "      available_to: [STENT-1]",
      "      action_families: [move]",
      "  continuation:",
      "    has_eligible_commitment_block: true",
      "    terminal_status: open",
      "    terminal_rationale: null",
      "plan:",
      "  plan_hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "prose_plan_path: pages-prose/PG-4.md",
      "emitted_choices:",
      "  - CHC-2",
      "  - CHC-3",
      "validation_trace: {}"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/pages/PG-4.yaml"
    );

    assert.deepEqual(pageEdges(parsed.edges), [
      edge("PG-4", "STENT-1", "page_active_record"),
      edge("PG-4", "STSTAT-1", "page_active_record"),
      edge("PG-4", "STPLAN-2", "page_active_record"),
      edge("PG-4", "STEMO-1", "page_active_record"),
      edge("PG-4", "STLOC-1", "page_visible_affordance_record"),
      edge("PG-4", "STOBJ-1", "page_visible_affordance_record"),
      edge("PG-4", "CHC-2", "page_emitted_choice"),
      edge("PG-4", "CHC-3", "page_emitted_choice")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SE records emit close, state-relation, alias-binding, and introduced-record edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-event-completion-"));

  try {
    writeStoryRecord(root, "harborwatch", "events", "SE-4", [
      "id: SE-4",
      "story_id: STORY-50",
      "created_at_page: PG-4",
      "parent_page_id: PG-3",
      "event_kind: selected_choice",
      "actor: STENT-1",
      "targets:",
      "  - STENT-2",
      "commitment:",
      "  selected_slt_id: SLT-3",
      "  selection_source: emitted_choice",
      "  alias_bindings:",
      "    actor: STENT-1",
      "    clock: CLK-1",
      "    plan: STPLAN-2",
      "outcome_route: accept",
      "world_logic_rationale: The accepted choice closes a clock and introduces a question.",
      "record_introductions:",
      "  - record_id: STQ-4",
      "    class: STQ",
      "    trigger: explicit_question_raised",
      "    evidence:",
      "      - PG-4",
      "      - SE-3",
      "    distinct_from: []",
      "state_relations:",
      "  - relation: advances",
      "    target_record: STPLAN-2",
      "  - relation: fulfills",
      "    target_record: OBL-1",
      "state_delta:",
      "  create:",
      "    - BEL-3",
      "  supersede:",
      "    - STSTAT-1",
      "  close:",
      "    - CLK-1",
      "    - STSEC-1",
      "promotion_claims: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/events/SE-4.yaml"
    );

    assert.deepEqual(eventCompletionEdges(parsed.edges), [
      edge("SE-4", "BEL-3", "state_delta_create"),
      edge("SE-4", "STSTAT-1", "state_delta_supersede"),
      edge("SE-4", "CLK-1", "state_delta_close"),
      edge("SE-4", "STSEC-1", "state_delta_close"),
      edge("SE-4", "STPLAN-2", "event_state_relation_target"),
      edge("SE-4", "OBL-1", "event_state_relation_target"),
      edge("SE-4", "STENT-1", "event_alias_binding"),
      edge("SE-4", "CLK-1", "event_alias_binding"),
      edge("SE-4", "STPLAN-2", "event_alias_binding"),
      edge("SE-4", "STQ-4", "event_introduces_record")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function pageEdges(
  edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>
): Array<{ source_node_id: string; target_unresolved_ref: string | null; edge_type: string; story_slug: string | null }> {
  return filteredEdges(edges, (edgeType) => edgeType.startsWith("page_"));
}

function eventCompletionEdges(
  edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>
): Array<{ source_node_id: string; target_unresolved_ref: string | null; edge_type: string; story_slug: string | null }> {
  return filteredEdges(edges, (edgeType) =>
    edgeType.startsWith("state_delta_") ||
    edgeType === "event_state_relation_target" ||
    edgeType === "event_alias_binding" ||
    edgeType === "event_introduces_record"
  );
}

function filteredEdges(
  edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>,
  predicate: (edgeType: string) => boolean
): Array<{ source_node_id: string; target_unresolved_ref: string | null; edge_type: string; story_slug: string | null }> {
  return edges
    .filter((row) => predicate(row.edge_type))
    .map((row) => ({
      source_node_id: row.source_node_id,
      target_unresolved_ref: row.target_unresolved_ref,
      edge_type: row.edge_type,
      story_slug: row.story_slug ?? null
    }));
}

function edge(
  sourceId: string,
  targetId: string,
  edgeType: string
): { source_node_id: string; target_unresolved_ref: string; edge_type: string; story_slug: string } {
  return {
    source_node_id: `harborwatch:${sourceId}`,
    target_unresolved_ref: `harborwatch:${targetId}`,
    edge_type: edgeType,
    story_slug: "harborwatch"
  };
}

function writeStoryRecord(root: string, storySlug: string, directoryName: string, recordId: string, lines: string[]): void {
  const directory = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", directoryName);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${recordId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}
