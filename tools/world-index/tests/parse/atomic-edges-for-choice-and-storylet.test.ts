import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseStoryBundleSourceFile } from "../../src/parse/atomic.js";

test("CHC records emit grounded record and affordance ordinal edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-choice-edges-"));

  try {
    writeStoryRecord(root, "harborwatch", "choices", "CHC-2", [
      "id: CHC-2",
      "story_id: STORY-50",
      "created_at_page: PG-4",
      "surface_label: Ring the bell.",
      "player_visible_intent: Warn the quay.",
      "target_or_action_families: [signal]",
      "likely_state_pressure: Raises alarm before the gate opens.",
      "grounded_in:",
      "  records:",
      "    - STENT-1",
      "    - STSTAT-1",
      "  affordance_ordinals:",
      "    - 1",
      "    - 3"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/choices/CHC-2.yaml"
    );

    assert.deepEqual(choiceEdges(parsed.edges), [
      edge("CHC-2", "STENT-1", "choice_grounded_in"),
      edge("CHC-2", "STSTAT-1", "choice_grounded_in"),
      attributeEdge("CHC-2", "harborwatch:PG-4#affordance:1", "choice_affordance_ordinal"),
      attributeEdge("CHC-2", "harborwatch:PG-4#affordance:3", "choice_affordance_ordinal")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SLT records emit predicate, effect, and exit likely-effect edges without legacy obligation edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-storylet-edges-"));

  try {
    writeStoryRecord(root, "harborwatch", "storylets", "SLT-3", [
      "id: SLT-3",
      "story_id: STORY-50",
      "title: Ring the bell",
      "scope:",
      "  visibility: global_author_pool",
      "move_family: disclosure",
      "preconditions:",
      "  hard:",
      "    - pred: any_plan_active(plan_axis, STPLAN-2)",
      "    - pred: emotion_active(STENT-1, fear, STEMO-1)",
      "    - pred: record_active",
      "      record: STCHAR-1",
      "    - pred: any",
      "      predicates:",
      "        - pred: obligation_open",
      "          obligation: OBL-1",
      "        - pred: not",
      "          predicate:",
      "            pred: record_active",
      "            record: STSEC-3",
      "  soft:",
      "    - pred: secret_unrevealed(STSEC-1)",
      "beats:",
      "  - beat_id: setup",
      "    function: setup",
      "    instruction: Surface the bell pressure.",
      "effects:",
      "  create:",
      "    - STQ-1",
      "  supersede:",
      "    - STPLAN-3",
      "  close:",
      "    - bound:matched_clock",
      "    - CLK-1",
      "exit_options:",
      "  - action_family: signal",
      "    surface_hint: Ring the watch bell.",
      "    likely_effects:",
      "      - bound:hidden_truth",
      "      - STSEC-2",
      "      - OBL-1",
      "opens_obligations: [OBL-2]",
      "pays_off_obligations: [OBL-3]",
      "complicates_obligations: [OBL-4]",
      "transfers_obligations: [OBL-5]",
      "saliency:",
      "  urgency: medium",
      "  cooldown_pages: 0",
      "mystery_policy:",
      "  allowed_authority: none",
      "provenance:",
      "  origin: manual_authoring",
      "grounding:",
      "  compatible_turn_drivers: [player_action]",
      "  reason_to_exist: Keeps the bell pressure in the pool."
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/storylets/SLT-3.yaml"
    );

    assert.deepEqual(storyletEdges(parsed.edges), [
      edge("SLT-3", "OBL-1", "storylet_predicate_ref"),
      edge("SLT-3", "STCHAR-1", "storylet_predicate_ref"),
      edge("SLT-3", "STEMO-1", "storylet_predicate_ref"),
      edge("SLT-3", "STENT-1", "storylet_predicate_ref"),
      edge("SLT-3", "STPLAN-2", "storylet_predicate_ref"),
      edge("SLT-3", "STSEC-3", "storylet_predicate_ref"),
      edge("SLT-3", "STSEC-1", "storylet_predicate_ref"),
      edge("SLT-3", "STQ-1", "storylet_effect_ref"),
      edge("SLT-3", "STPLAN-3", "storylet_effect_ref"),
      edge("SLT-3", "CLK-1", "storylet_effect_ref"),
      edge("SLT-3", "STSEC-2", "storylet_exit_likely_effect_ref"),
      edge("SLT-3", "OBL-1", "storylet_exit_likely_effect_ref"),
      attributeEdge("SLT-3", "player_action", "storylet_compatible_driver"),
      attributeEdge("SLT-3", "any", "storylet_predicate_pred"),
      attributeEdge("SLT-3", "any_plan_active", "storylet_predicate_pred"),
      attributeEdge("SLT-3", "emotion_active", "storylet_predicate_pred"),
      attributeEdge("SLT-3", "not", "storylet_predicate_pred"),
      attributeEdge("SLT-3", "obligation_open", "storylet_predicate_pred"),
      attributeEdge("SLT-3", "record_active", "storylet_predicate_pred"),
      attributeEdge("SLT-3", "secret_unrevealed", "storylet_predicate_pred"),
      attributeEdge("SLT-3", "signal", "storylet_action_family")
    ]);

    const legacyEdgeTypes = new Set([
      "opens_obligation",
      "pays_off_obligation",
      "complicates_obligation",
      "transfers_obligation"
    ]);
    assert.equal(parsed.edges.some((row) => legacyEdgeTypes.has(row.edge_type)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function choiceEdges(
  edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>
): Array<{ source_node_id: string; target_unresolved_ref: string | null; edge_type: string; story_slug: string | null }> {
  return filteredEdges(edges, (edgeType) => edgeType.startsWith("choice_"));
}

function storyletEdges(
  edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>
): Array<{ source_node_id: string; target_unresolved_ref: string | null; edge_type: string; story_slug: string | null }> {
  return filteredEdges(edges, (edgeType) => edgeType.startsWith("storylet_"));
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

function attributeEdge(
  sourceId: string,
  targetRef: string,
  edgeType: string
): { source_node_id: string; target_unresolved_ref: string; edge_type: string; story_slug: string } {
  return {
    source_node_id: `harborwatch:${sourceId}`,
    target_unresolved_ref: targetRef,
    edge_type: edgeType,
    story_slug: "harborwatch"
  };
}

function writeStoryRecord(root: string, storySlug: string, directoryName: string, recordId: string, lines: string[]): void {
  const directory = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", directoryName);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${recordId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}
