import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { build } from "@worldloom/world-index/commands/build";
import { verify } from "@worldloom/world-index/commands/verify";

import { getContextPacket } from "../../src/tools/get-context-packet.js";
import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";

const WORLD_SLUG = "stchar-drift-packet-world";
const STORY_SLUG = "gatewatch";

function writeFile(root: string, relativePath: string, lines: string[]): void {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
}

function buildWorldOnDisk(root: string): void {
  writeFile(root, path.join("worlds", WORLD_SLUG, "WORLD_KERNEL.md"), [
    "# STCHAR Drift Packet Fixture"
  ]);
  writeFile(root, path.join("worlds", WORLD_SLUG, "ONTOLOGY.md"), [
    "# Ontology",
    "",
    "## Categories in Use",
    "- person",
    "",
    "## Relation Types in Use",
    "- watches",
    "",
    "## Notes on Use",
    "STCHAR drift coverage."
  ]);
  writeFile(root, path.join("worlds", WORLD_SLUG, "_source", "canon", "CF-1.yaml"), [
    "id: CF-1",
    "title: A gate watch",
    "status: hard_canon",
    "type: event",
    "statement: Wardens stand the gate watch.",
    "scope:",
    "  geographic: local",
    "  temporal: current",
    "  social: public",
    "truth_scope:",
    "  world_level: true",
    "  diegetic_status: objective",
    "domains_affected: [institutions]",
    "required_world_updates: []",
    "source_basis:",
    "  direct_user_approval: true",
    "modification_history: []"
  ]);
  writeFile(root, path.join("worlds", WORLD_SLUG, "_source", "change-log", "CH-1.yaml"), [
    "change_id: CH-1",
    "date: 2026-05-30",
    "change_type: addition",
    "affected_fact_ids: [CF-1]",
    "summary: Fixture change.",
    "reason: [fixture]",
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
  ]);
  writeFile(root, path.join("worlds", WORLD_SLUG, "_source", "invariants", "ONT-1.yaml"), [
    "id: ONT-1",
    "category: ontological",
    "title: Persons act.",
    "statement: Persons act with intent.",
    "rationale: keep characters embodied",
    "examples: []",
    "non_examples: []",
    "break_conditions: user-approved retcon",
    "revision_difficulty: high"
  ]);
  writeFile(root, path.join("worlds", WORLD_SLUG, "_source", "mystery-reserve", "M-1.yaml"), [
    "id: M-1",
    "title: The bell tower",
    "status: active",
    "knowns: []",
    "unknowns: []",
    "common_interpretations: []",
    "disallowed_cheap_answers: []",
    "domains_touched: [institutions]",
    "future_resolution_safety: medium",
    "firewall_for: [CF-1]"
  ]);
  writeFile(root, path.join("worlds", WORLD_SLUG, "_source", "open-questions", "OQ-1.yaml"), [
    "id: OQ-1",
    "topic: Watch",
    "body: Who keeps the watch?",
    "when_to_resolve: when needed"
  ]);

  writeFile(
    root,
    path.join("worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", "entities", "STENT-1.yaml"),
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
    ]
  );

  const stcharBody = [
    "---",
    "id: STCHAR-1",
    "story_id: STORY-1",
    `story_slug: ${STORY_SLUG}`,
    `world_slug: ${WORLD_SLUG}`,
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
    "Marla Kern walks the gate watch quietly."
  ];
  writeFile(
    root,
    path.join("worlds", WORLD_SLUG, "stories", STORY_SLUG, "story-characters", "STCHAR-1.md"),
    stcharBody
  );
}

test("packet open_risks contains no STCHAR fail-severity content_hash_drift after build+verify", async () => {
  const root = createTempRepoRoot();

  try {
    buildWorldOnDisk(root);

    const buildExit = build(root, WORLD_SLUG);
    assert.equal(buildExit, 0, "build must succeed for the STCHAR drift packet fixture");

    const verifyExit = verify(root, WORLD_SLUG);
    assert.equal(
      verifyExit,
      0,
      "verify must return 0 against a fresh build of an STCHAR-bearing bundle"
    );

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_turn_cycle",
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        seed_nodes: [`${STORY_SLUG}:STCHAR-1`],
        token_budget: 100000
      })
    );

    assert.ok(
      !("code" in packet),
      `expected packet response, got ${"code" in packet ? packet.code : "n/a"}`
    );

    const stcharFailDrift = packet.governing_world_context.open_risks.filter((risk) => {
      if (risk.severity !== "fail" || risk.code !== "content_hash_drift") {
        return false;
      }
      const isStcharFile = risk.file_path !== null && risk.file_path.includes("story-characters/");
      const isStcharNode = risk.node_id !== null && risk.node_id.includes("STCHAR-");
      return isStcharFile || isStcharNode;
    });

    assert.deepEqual(
      stcharFailDrift,
      [],
      `expected zero STCHAR fail-severity content_hash_drift entries in open_risks; got ${JSON.stringify(
        stcharFailDrift,
        null,
        2
      )}`
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
