import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export function createAtomicRepoRoot(worldSlug = "atomic-world"): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-atomic-"));
  const world = path.join(root, "worlds", worldSlug);
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

export function createLegacyRepoRoot(worldSlug = "legacy-world"): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-legacy-"));
  const world = path.join(root, "worlds", worldSlug);
  mkdirSync(path.join(world, "_source"), { recursive: true });
  writeFileSync(path.join(world, "WORLD_KERNEL.md"), "# Legacy Fixture\n", "utf8");
  writeFileSync(path.join(world, "ONTOLOGY.md"), "# Ontology\n", "utf8");
  writeFileSync(path.join(world, "_source", "raw.md"), "# Ignored raw note\n", "utf8");
  return root;
}

export function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function writeAtomic(world: string, directory: string, fileName: string, lines: string[]): void {
  const targetDirectory = path.join(world, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}
