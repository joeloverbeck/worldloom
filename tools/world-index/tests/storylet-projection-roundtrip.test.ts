import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { insertParsedFile } from "../src/commands/shared.js";
import { openIndex } from "../src/index/open.js";
import { parseStoryBundleSourceFile } from "../src/parse/atomic.js";

test("SLT projection rows and coarse filter edges roundtrip from source YAML", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-slt-projection-"));

  try {
    writeStorylet(root, "harborwatch", "SLT-3", [
      "id: SLT-3",
      "story_id: STORY-50",
      "title: Ring the hidden bell",
      "scope:",
      "  visibility: branch_prefix_scoped",
      "  branch_id: BR-4",
      "  visible_branch_path_prefix: [PG-1, PG-2]",
      "move_family: disclosure",
      "preconditions:",
      "  hard:",
      "    - pred: record_active",
      "      record: STCHAR-1",
      "      record_class: ignored_legacy_field",
      "    - pred: any",
      "      predicates:",
      "        - pred: any_plan_active",
      "          alias: plan_axis",
      "          holder_role: primary_actor",
      "  soft:",
      "    - pred: emotion_active(STENT-1, fear, STEMO-1)",
      "      kind: fear",
      "beats:",
      "  - beat_id: setup",
      "    function: setup",
      "    instruction: Surface the bell as an option.",
      "exit_options:",
      "  - action_family: communicate",
      "    surface_hint: Ring the hidden bell.",
      "    likely_effects: [STQ-1]",
      "  - action_family: investigate",
      "    surface_hint: Inspect the hidden bell.",
      "saliency:",
      "  urgency: high",
      "  cooldown_pages: 2",
      "mystery_policy:",
      "  allowed_authority: apparent",
      "provenance:",
      "  origin: manual_authoring",
      "grounding:",
      "  compatible_turn_drivers: [player_action, secret_reveal]",
      "  reason_to_exist: Keeps the hidden bell pressure available."
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/storylets/SLT-3.yaml"
    );
    const db = openIndex(root, "fixture-world");

    try {
      insertParsedFile(db, "fixture-world", parsed);

      const projection = db
        .prepare("SELECT * FROM slt_projections WHERE node_id = ?")
        .get("harborwatch:SLT-3") as Record<string, unknown>;
      assert.deepEqual(
        {
          node_id: projection.node_id,
          world_slug: projection.world_slug,
          story_slug: projection.story_slug,
          slt_scope_visibility: projection.slt_scope_visibility,
          slt_scope_branch_id: projection.slt_scope_branch_id,
          slt_scope_branch_path_prefix: projection.slt_scope_branch_path_prefix,
          slt_provenance_origin: projection.slt_provenance_origin,
          slt_move_family: projection.slt_move_family,
          slt_saliency_urgency: projection.slt_saliency_urgency,
          slt_saliency_cooldown_pages: projection.slt_saliency_cooldown_pages,
          slt_mystery_policy_allowed_authority: projection.slt_mystery_policy_allowed_authority
        },
        {
          node_id: "harborwatch:SLT-3",
          world_slug: "fixture-world",
          story_slug: "harborwatch",
          slt_scope_visibility: "branch_prefix_scoped",
          slt_scope_branch_id: "BR-4",
          slt_scope_branch_path_prefix: "[\"PG-1\",\"PG-2\"]",
          slt_provenance_origin: "manual_authoring",
          slt_move_family: "disclosure",
          slt_saliency_urgency: "high",
          slt_saliency_cooldown_pages: 2,
          slt_mystery_policy_allowed_authority: "apparent"
        }
      );
      assert.equal(typeof projection.candidate_projection_hash, "string");
      assert.equal((projection.candidate_projection_hash as string).length, 64);

      const edgeRows = db
        .prepare(
          `
            SELECT edge_type, target_unresolved_ref
            FROM edges
            WHERE source_node_id = ?
              AND edge_type IN (
                'storylet_compatible_driver',
                'storylet_predicate_pred',
                'storylet_predicate_class',
                'storylet_action_family'
              )
            ORDER BY edge_type, target_unresolved_ref
          `
        )
        .all("harborwatch:SLT-3") as Array<{ edge_type: string; target_unresolved_ref: string }>;
      assert.deepEqual(edgeRows, [
        { edge_type: "storylet_action_family", target_unresolved_ref: "communicate" },
        { edge_type: "storylet_action_family", target_unresolved_ref: "investigate" },
        { edge_type: "storylet_compatible_driver", target_unresolved_ref: "player_action" },
        { edge_type: "storylet_compatible_driver", target_unresolved_ref: "secret_reveal" },
        { edge_type: "storylet_predicate_class", target_unresolved_ref: "story_character_authority_record" },
        { edge_type: "storylet_predicate_class", target_unresolved_ref: "story_emotion_record" },
        { edge_type: "storylet_predicate_class", target_unresolved_ref: "story_entity_record" },
        { edge_type: "storylet_predicate_class", target_unresolved_ref: "story_plan_record" },
        { edge_type: "storylet_predicate_pred", target_unresolved_ref: "any" },
        { edge_type: "storylet_predicate_pred", target_unresolved_ref: "any_plan_active" },
        { edge_type: "storylet_predicate_pred", target_unresolved_ref: "emotion_active" },
        { edge_type: "storylet_predicate_pred", target_unresolved_ref: "record_active" }
      ]);
    } finally {
      db.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeStorylet(root: string, storySlug: string, recordId: string, lines: string[]): void {
  const directory = path.join(root, "worlds", "fixture-world", "stories", storySlug, "_source", "storylets");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${recordId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}
