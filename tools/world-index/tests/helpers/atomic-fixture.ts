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
  writeStory(world, "harborwatch", "entities", "STENT-0001.yaml", [
    "id: STENT-0001",
    "story_id: STORY-0001",
    "world_ent_id: ENT-0001",
    "character_id: null",
    "name: Brinewick",
    "role_in_story: [primary_actor]",
    "present_at_start: true",
    "story_only: false",
    "created_at_page: PG-0001",
    "notes: Brinewick anchors the harborwatch story."
  ]);
  writeStory(world, "harborwatch", "beliefs", "BEL-1.yaml", [
    "id: BEL-1",
    "story_id: STORY-1",
    "created_at_page: PG-1",
    "holder: STENT-0001",
    "claim: Brinewick believes the salt gate needs watching.",
    "belief_mode: believes",
    "truth_relation: true",
    "confidence: high",
    "visibility: shared",
    "basis:",
    "  source_event: SE-1",
    "  access_route: authorial_initialization",
    "  access_records: [STENT-0001]",
    "consequences:",
    "  opens: []",
    "  constrains_choices: []"
  ]);
  writeStory(world, "harborwatch", "facts", "SF-0001.yaml", [
    "id: SF-0001",
    "story_id: STORY-0001",
    "created_at_page: PG-0001",
    "subject: STENT-0001",
    "predicate: guards",
    "object: salt gate",
    "epistemic_class: objective",
    "truth_value: true",
    "derived_from_cf: CF-0001",
    "notes: Brinewick knows the salt gate."
  ]);
  writeStory(world, "harborwatch", "obligations", "OBL-0001.yaml", [
    "id: OBL-0001",
    "story_id: STORY-0001",
    "type: mystery",
    "introduced_at_page: PG-0001",
    "owner: STENT-0001",
    "dependent_facts: [SF-0001]",
    "status: open",
    "notes: Resolve the salt gate question."
  ]);
  writeStory(world, "harborwatch", "threads", "THR-0001.yaml", [
    "id: THR-0001",
    "story_id: STORY-0001",
    "type: mystery",
    "status: active",
    "title: Gate watch",
    "obligations: [OBL-0001]",
    "created_at_page: PG-0001",
    "notes: Gate watch remains open."
  ]);
  writeStory(world, "harborwatch", "branches", "BR-0001.yaml", [
    "id: BR-0001",
    "story_id: STORY-0001",
    "root_page_id: PG-0001",
    "current_leaf_page_id: PG-0001",
    "forked_from_page_id: null"
  ]);
  writeStory(world, "harborwatch", "pages", "PG-0001.yaml", [
    "id: PG-0001",
    "story_id: STORY-0001",
    "branch_id: BR-0001",
    "parent_page_id: null",
    "branch_path: [PG-0001]",
    "state_snapshot:",
    "  objective_facts: [SF-0001]",
    "notes: Brinewick watches the gate."
  ]);
  writeStory(world, "harborwatch", "choices", "CHC-0001.yaml", [
    "id: CHC-0001",
    "story_id: STORY-0001",
    "parent_page_id: PG-0001",
    "choice_text: Keep watching.",
    "notes: Continue the watch."
  ]);
  writeStory(world, "harborwatch", "storylets", "SLT-0001.yaml", [
    "id: SLT-0001",
    "story_id: STORY-0001",
    "title: Watch the salt gate",
    "opens_obligations:",
    "  - id: OBL-0001",
    "pays_off_obligations:",
    "  - obligation_id_matcher:",
    "      id: OBL-0001",
    "provenance:",
    "  origin: bootstrap_seed",
    "  created_at_page: PG-0001",
    "notes: Brinewick can decide whether to keep watching."
  ]);
  writeStory(world, "harborwatch-alt", "storylets", "SLT-0001.yaml", [
    "id: SLT-0001",
    "story_id: STORY-0002",
    "title: Alternate watch",
    "opens_obligations: []",
    "pays_off_obligations: []",
    "provenance:",
    "  origin: bootstrap_seed",
    "  created_at_page: null",
    "notes: Duplicate bare storylet ids are legal across stories."
  ]);
  writeStory(world, "harborwatch", "clocks", "CLK-1.yaml", [
    "id: CLK-1",
    "story_id: STORY-1",
    "created_at_page: PG-1",
    "supersedes: null",
    "title: Gate deadline",
    "clock_kind: deadline",
    "driver: system",
    "linked_records: []",
    "value: 2",
    "max: 6",
    "salience: high",
    "visibility: public",
    "thresholds: []",
    "tick_history: []",
    "status: active",
    "resolution_event: null"
  ]);
  writeStory(world, "harborwatch", "secrets", "STSEC-1.yaml", [
    "id: STSEC-1",
    "story_id: STORY-1",
    "created_at_page: PG-1",
    "supersedes: null",
    "secret_kind: identity",
    "secret_claim: The gate keeper has the old key.",
    "truth_anchor: null",
    "holders: []",
    "salience: high",
    "protected_mystery_refs: []",
    "clue_carriers: []",
    "reveal_records: []",
    "status: hidden"
  ]);
  writeStory(world, "harborwatch", "story-questions", "STQ-1.yaml", [
    "id: STQ-1",
    "story_id: STORY-1",
    "created_at_page: PG-1",
    "supersedes: null",
    "setup_kind: setup",
    "question_or_setup: Who opens the gate?",
    "salience: medium",
    "audience_visibility: implied",
    "source_event: null",
    "source_records: []",
    "payoff_of: null",
    "status: open",
    "answer_event: null",
    "answer_records: []"
  ]);
  writeStory(world, "harborwatch", "plans", "STPLAN-1.yaml", [
    "id: STPLAN-1",
    "story_id: STORY-1",
    "created_at_page: PG-1",
    "created_by_event: null",
    "supersedes: null",
    "holder: STENT-0001",
    "root_intention: null",
    "objective: Keep the gate watched.",
    "plan_status: active",
    "belief_basis: [BEL-1]",
    "resource_basis:",
    "  facts: [SF-0001]",
    "  objects: []",
    "  locations: []",
    "  artifacts: []",
    "  relationships: []",
    "  obligations: []",
    "blockers: []",
    "current_step:",
    "  action_family: investigate",
    "  target_records: [STQ-1]",
    "  success_condition:",
    "    predicates:",
    "      - pred: record_active(STQ-1)",
    "fallback_steps: []",
    "expires_when: when the gate is secure",
    "derived_from: []"
  ]);
  writeStory(world, "harborwatch", "emotions", "STEMO-1.yaml", [
    "id: STEMO-1",
    "story_id: STORY-1",
    "created_at_page: PG-1",
    "created_by_event: null",
    "supersedes: null",
    "holder: STENT-0001",
    "status: active",
    "affect_kind: worry",
    "intensity: medium",
    "orientation:",
    "  toward_records: [STQ-1]",
    "appraisal_basis: [BEL-1]",
    "trigger_event: null",
    "behavioral_pressure: [investigate]",
    "agency_effect: constraining",
    "expires_when: when the gate is secure",
    "derived_from: []"
  ]);
  writeStoryMarkdown(world, "harborwatch", "STORY_KERNEL.md", [
    "---",
    "story_id: STORY-0001",
    "story_slug: harborwatch",
    "---",
    "# Harborwatch"
  ]);
  writeStoryMarkdown(world, "harborwatch", "pages-prose/PG-0001.md", [
    "# Page PG-0001",
    "",
    "Brinewick watches the salt gate."
  ]);
  writeStoryArtifact(world, "harborwatch", "pages-prose-receipts/PG-1.yaml", [
    "page_id: PG-1",
    "story_id: STORY-1",
    "plan_path: pages-prose-plans/PG-1.md",
    "prose_path: pages-prose/PG-1.md",
    "plan_hash: 0000000000000000000000000000000000000000000000000000000000000000",
    "prose_hash: 1111111111111111111111111111111111111111111111111111111111111111",
    "state_hash_at_plan_time: 2222222222222222222222222222222222222222222222222222222222222222",
    "checked_at: 2026-05-17T00:00:00Z",
    "strict: true",
    "verdict: PASS",
    "checks:",
    "  hash_integrity: PASS",
    "  engine_jargon_leak: PASS",
    "  forbidden_mystery_resolution: PASS",
    "  required_event_rendered: PASS",
    "  choice_consequence_visibility: PASS",
    "  entity_status_consistency: PASS",
    "  invented_structural_fact: PASS",
    "  canon_claim_without_authority: PASS",
    "  craft_critic: NOT_RUN",
    "notes: []",
    "repair_recommendation: none"
  ]);
  writeStoryMarkdown(world, "harborwatch", "storylet-batches/SLB-0001.md", [
    "# Storylet Batch SLB-0001"
  ]);
  writeStoryMarkdown(world, "harborwatch", "story-promotions/SP-0001.md", [
    "# Story Promotion SP-0001"
  ]);
  writeStoryMarkdown(world, "harborwatch", "audits/SAU-0001-2026-05-04.md", [
    "# Story Audit SAU-0001"
  ]);
  writeStoryMarkdown(
    world,
    "harborwatch",
    "audits/SAU-0001/remediation-storylet-proposals/RSP-0001-fix-thread-coverage.md",
    ["# Remediation Proposal RSP-0001"]
  );
  writeStoryMarkdown(world, "harborwatch", "character-proposals/NCP-0001-sample.md", [
    "# Character Proposal NCP-0001"
  ]);
  writeStoryMarkdown(world, "harborwatch", "character-proposals/batches/NCB-0001.md", [
    "# Character Proposal Batch NCB-0001"
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

function writeStory(
  world: string,
  storySlug: string,
  directory: string,
  fileName: string,
  lines: string[]
): void {
  const targetDirectory = path.join(world, "stories", storySlug, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryMarkdown(
  world: string,
  storySlug: string,
  relativeFilePath: string,
  lines: string[]
): void {
  writeStoryArtifact(world, storySlug, relativeFilePath, lines);
}

function writeStoryArtifact(
  world: string,
  storySlug: string,
  relativeFilePath: string,
  lines: string[]
): void {
  const targetPath = path.join(world, "stories", storySlug, relativeFilePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${lines.join("\n")}\n`, "utf8");
}
