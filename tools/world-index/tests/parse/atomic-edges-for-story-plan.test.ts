import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseStoryBundleSourceFile } from "../../src/parse/atomic.js";

test("STPLAN records emit plan ownership, basis, target, provenance, and supersession edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-plan-edges-"));

  try {
    writeStoryPlan(root, "harborwatch", "STPLAN-2", [
      "id: STPLAN-2",
      "story_id: STORY-47",
      "created_at_page: PG-3",
      "created_by_event: SE-3",
      "supersedes: STPLAN-1",
      "holder: STENT-1",
      "root_intention: STINT-1",
      "objective: Use the watch bell to force a public reckoning.",
      "plan_status: active",
      "belief_basis:",
      "  - BEL-1",
      "  - BEL-2",
      "resource_basis:",
      "  facts: [SF-1]",
      "  objects: [STOBJ-1]",
      "  locations: [STLOC-1]",
      "  artifacts: [DA-1]",
      "  relationships: [SREL-1]",
      "  obligations: [OBL-1]",
      "blockers:",
      "  - STSEC-1",
      "  - system",
      "  - group:watch",
      "current_step:",
      "  action_family: reveal",
      "  target_records:",
      "    - STQ-1",
      "    - unknown",
      "  success_condition:",
      "    predicates:",
      "      - pred: plan_active(STPLAN-4)",
      "      - pred: record_active(BEL-3)",
      "      - pred: record_active",
      "        record: STCHAR-1",
      "      - pred: not",
      "        predicate:",
      "          pred: obligation_open",
      "          obligation: OBL-3",
      "fallback_steps:",
    "  - action_family: bargain",
    "    target_records:",
    "      - OBL-2",
    "      - group:watch",
    "    trigger_predicates:",
    "      - pred: record_active(STSEC-2)",
    "      - pred: emotion_active(STENT-1, fear)",
    "      - pred: any",
    "        predicates:",
    "          - pred: obligation_open",
    "            obligation: OBL-4",
      "expires_when: after STPLAN-4 fulfills",
      "derived_from:",
      "  - SE-2"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/plans/STPLAN-2.yaml"
    );

    assert.deepEqual(planEdges(parsed.edges), [
      edge("STPLAN-2", "STENT-1", "plan_holder"),
      edge("STPLAN-2", "STINT-1", "plan_root_intention"),
      edge("STPLAN-2", "BEL-1", "plan_belief_basis"),
      edge("STPLAN-2", "BEL-2", "plan_belief_basis"),
      edge("STPLAN-2", "SF-1", "plan_resource_basis"),
      edge("STPLAN-2", "STOBJ-1", "plan_resource_basis"),
      edge("STPLAN-2", "STLOC-1", "plan_resource_basis"),
      edge("STPLAN-2", "DA-1", "plan_resource_basis"),
      edge("STPLAN-2", "SREL-1", "plan_resource_basis"),
      edge("STPLAN-2", "OBL-1", "plan_resource_basis"),
      edge("STPLAN-2", "STSEC-1", "plan_blocker"),
      edge("STPLAN-2", "STQ-1", "plan_current_step_target"),
      edge("STPLAN-2", "BEL-3", "plan_success_predicate_ref"),
      edge("STPLAN-2", "OBL-3", "plan_success_predicate_ref"),
      edge("STPLAN-2", "STCHAR-1", "plan_success_predicate_ref"),
      edge("STPLAN-2", "STPLAN-4", "plan_success_predicate_ref"),
      edge("STPLAN-2", "OBL-2", "plan_fallback_step_target"),
      edge("STPLAN-2", "OBL-4", "plan_fallback_predicate_ref"),
      edge("STPLAN-2", "STENT-1", "plan_fallback_predicate_ref"),
      edge("STPLAN-2", "STSEC-2", "plan_fallback_predicate_ref"),
      edge("STPLAN-2", "SE-2", "plan_derived_from"),
      edge("STPLAN-2", "STPLAN-4", "plan_expires_when_ref"),
      edge("STPLAN-2", "SE-3", "plan_created_by_event"),
      edge("STPLAN-2", "STPLAN-1", "plan_supersedes")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("STPLAN records with empty optional fields emit only populated plan edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-plan-empty-"));

  try {
    writeStoryPlan(root, "harborwatch", "STPLAN-3", [
      "id: STPLAN-3",
      "story_id: STORY-47",
      "created_at_page: PG-3",
      "created_by_event: SE-3",
      "supersedes: null",
      "holder: STENT-1",
      "root_intention: STINT-1",
      "objective: Wait for the witness.",
      "plan_status: suspended",
      "belief_basis: []",
      "resource_basis:",
      "  facts: []",
      "  objects: []",
      "  locations: []",
      "  artifacts: []",
      "  relationships: []",
      "  obligations: []",
      "blockers: []",
      "current_step:",
      "  action_family: wait",
      "  target_records: []",
      "  success_condition:",
      "    predicates: []",
      "fallback_steps: []",
      "expires_when: after the witness arrives",
      "derived_from: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/plans/STPLAN-3.yaml"
    );

    assert.deepEqual(planEdges(parsed.edges), [
      edge("STPLAN-3", "STENT-1", "plan_holder"),
      edge("STPLAN-3", "STINT-1", "plan_root_intention"),
      edge("STPLAN-3", "SE-3", "plan_created_by_event")
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function planEdges(
  edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>
): Array<{ source_node_id: string; target_unresolved_ref: string | null; edge_type: string; story_slug: string | null }> {
  return edges
    .filter((row) => row.edge_type.startsWith("plan_"))
    .map((row) => ({
      source_node_id: row.source_node_id,
      target_unresolved_ref: row.target_unresolved_ref,
      edge_type: row.edge_type,
      story_slug: row.story_slug ?? null
    }));
}

function edge(sourceId: string, targetId: string, edgeType: string): {
  source_node_id: string;
  target_unresolved_ref: string;
  edge_type: string;
  story_slug: string;
} {
  return {
    source_node_id: `harborwatch:${sourceId}`,
    target_unresolved_ref: `harborwatch:${targetId}`,
    edge_type: edgeType,
    story_slug: "harborwatch"
  };
}

function writeStoryPlan(root: string, storySlug: string, planId: string, lines: string[]): void {
  const directory = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", "plans");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${planId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}
