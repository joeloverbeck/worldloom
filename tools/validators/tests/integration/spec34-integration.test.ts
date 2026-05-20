import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import yaml from "js-yaml";

const cliPath = path.resolve(process.cwd(), "dist/src/cli/world-validate.js");

const SPEC34_VALIDATORS = [
  "branch_isolation",
  "observer_firewall",
  "lie_promoted_silently",
  "canon_baseline_drift"
] as const;

const SPEC34_FAIL_CODES = [
  "branch_isolation_violation",
  "observer_firewall_violation_private_belief_leak",
  "lie_promoted_silently",
  "canon_baseline_drift_window_incomplete"
] as const;

test("SPEC-34 validators run together through world-validate CLI with pass and fail worlds", () => {
  const passRepo = createSpec34Repo("spec34-pass", passRecords());
  const passRun = runWorldValidate(passRepo, "spec34-pass");
  assert.equal(passRun.status, 0, passRun.stderr + passRun.stdout);
  const passJson = parseRun(passRun.stdout);
  for (const validator of SPEC34_VALIDATORS) {
    assert.ok(passJson.summary.validators_run.includes(validator), `${validator} did not run in PASS fixture`);
  }
  assert.equal(passJson.summary.fail_count, 0);

  const failRepo = createSpec34Repo("spec34-fail", failRecords());
  const failRun = runWorldValidate(failRepo, "spec34-fail");
  assert.equal(failRun.status, 1, failRun.stderr + failRun.stdout);
  const failJson = parseRun(failRun.stdout);
  const actualCodes = new Set(failJson.verdicts.map((verdict) => verdict.code));
  for (const expectedCode of SPEC34_FAIL_CODES) {
    assert.ok(actualCodes.has(expectedCode), `${expectedCode} did not appear in FAIL fixture: ${[...actualCodes].join(", ")}`);
  }
});

interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface ValidatorRunJson {
  verdicts: Array<{ code: string; validator: string; severity: string }>;
  summary: {
    fail_count: number;
    validators_run: string[];
  };
}

interface FixtureRecord {
  node_id: string;
  story_slug?: string;
  file_path: string;
  node_type: string;
  body: Record<string, unknown>;
}

function runWorldValidate(repo: string, worldSlug: string): CliRun {
  return spawnSync(process.execPath, [cliPath, worldSlug, "--structural", "--json"], {
    cwd: repo,
    encoding: "utf8"
  });
}

function parseRun(stdout: string): ValidatorRunJson {
  return JSON.parse(stdout) as ValidatorRunJson;
}

function createSpec34Repo(worldSlug: string, records: FixtureRecord[]): string {
  const repo = mkdtempSync(path.join(tmpdir(), "worldloom-spec34-"));
  const world = path.join(repo, "worlds", worldSlug);
  mkdirSync(path.join(world, "_index"), { recursive: true });

  for (const record of records) {
    const fullPath = path.join(world, record.file_path);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, yaml.dump(record.body), "utf8");
  }

  const db = new Database(path.join(world, "_index", "world.db"));
  db.exec(`
    CREATE TABLE nodes (
      node_id TEXT PRIMARY KEY,
      world_slug TEXT NOT NULL,
      story_slug TEXT,
      file_path TEXT NOT NULL,
      node_type TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE validation_results (
      result_id INTEGER PRIMARY KEY AUTOINCREMENT,
      world_slug TEXT NOT NULL,
      validator_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      node_id TEXT,
      file_path TEXT,
      line_range_start INTEGER,
      line_range_end INTEGER,
      created_at TEXT NOT NULL
    );
  `);
  const insert = db.prepare(
    "INSERT INTO nodes (node_id, world_slug, story_slug, file_path, node_type, body) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const record of records) {
    insert.run(record.node_id, worldSlug, record.story_slug ?? null, record.file_path, record.node_type, yaml.dump(record.body));
  }
  db.close();

  return repo;
}

function passRecords(): FixtureRecord[] {
  const records = commonRecords();
  records.push(
    branch("BR-1", null, "PG-1"),
    branch("BR-2", "BR-1", "PG-2"),
    entity("STENT-1", "PG-1", "Runner"),
    storylet("SLT-1"),
    event("SE-1", "PG-1", "story_start", "system", null),
    event("SE-2", "PG-2", "selected_choice", "STENT-1", "SLT-1", "Drift classification compatible after reviewing CH-3 only."),
    belief("BEL-1", "PG-1", "STENT-1", "true", "private", ["SF-1"]),
    fact("SF-1", "PG-1", "branch_local", ["CF-1"]),
    fact("SF-2", "PG-2", "branch_local", ["BEL-1"]),
    choice("CHC-1", "PG-1", ["BEL-1"]),
    page("PG-1", "BR-1", null, "SE-1", "CHC-1", ["PG-1"], ["SF-1"], "compatible after reviewing CH-2 and CH-3"),
    page("PG-2", "BR-2", "PG-1", "SE-2", "CHC-1", ["PG-1", "PG-2"], ["SF-1", "SF-2"], "compatible after reviewing CH-2 and CH-3")
  );
  return records;
}

function failRecords(): FixtureRecord[] {
  const records = commonRecords();
  records.push(
    branch("BR-1", null, "PG-1"),
    branch("BR-2", "BR-1", "PG-2"),
    branch("BR-3", "BR-1", "PG-3"),
    entity("STENT-1", "PG-1", "Borrower"),
    entity("STENT-2", "PG-1", "Keeper"),
    storylet("SLT-1"),
    event("SE-1", "PG-1", "story_start", "system", null),
    event("SE-2", "PG-2", "selected_choice", "STENT-1", "SLT-1", "Drift classification compatible after reviewing CH-3 only."),
    belief("BEL-1", "PG-1", "STENT-1", "true", "private", ["SF-1"]),
    belief("BEL-2", "PG-1", "STENT-2", "true", "private", []),
    belief("BEL-3", "PG-1", "STENT-1", "false", "private", []),
    fact("SF-1", "PG-1", "branch_local", ["CF-1"]),
    fact("SF-3", "PG-3", "branch_local", []),
    fact("SF-4", "PG-2", "branch_local", ["BEL-3"]),
    fact("SF-5", "PG-2", "branch_local", ["CF-1"]),
    choice("CHC-1", "PG-1", ["BEL-2"]),
    page("PG-1", "BR-1", null, "SE-1", "CHC-1", ["PG-1"], ["SF-1"], "compatible after reviewing CH-2 and CH-3"),
    page("PG-2", "BR-2", "PG-1", "SE-2", "CHC-1", ["PG-1", "PG-2"], ["SF-3", "SF-4", "SF-5"], "compatible after reviewing CH-3"),
    page("PG-3", "BR-3", "PG-1", "SE-1", null, ["PG-1", "PG-3"], ["SF-3"], "compatible after reviewing CH-2 and CH-3")
  );
  return records;
}

function commonRecords(): FixtureRecord[] {
  return [
    worldRecord("CF-1", "_source/canon/CF-1.yaml", "canon_fact_record", validCanonFact()),
    worldRecord("SEC-INS-001", "_source/institutions/SEC-INS-001.yaml", "section", validSection()),
    worldRecord("CH-1", "_source/change-log/CH-1.yaml", "change_log_entry", change("CH-1", [])),
    worldRecord("CH-2", "_source/change-log/CH-2.yaml", "change_log_entry", change("CH-2", ["CF-1"])),
    worldRecord("CH-3", "_source/change-log/CH-3.yaml", "change_log_entry", change("CH-3", []))
  ];
}

function worldRecord(nodeId: string, filePath: string, nodeType: string, body: Record<string, unknown>): FixtureRecord {
  return { node_id: nodeId, file_path: filePath, node_type: nodeType, body };
}

function storyRecord(nodeType: string, id: string, sourceDir: string, body: Record<string, unknown>): FixtureRecord {
  return {
    node_id: id,
    story_slug: "test-bundle",
    file_path: `stories/test-bundle/_source/${sourceDir}/${id}.yaml`,
    node_type: nodeType,
    body
  };
}

function change(changeId: string, affectedFactIds: string[]): Record<string, unknown> {
  return {
    change_id: changeId,
    date: "2026-05-16",
    change_type: "addition",
    affected_fact_ids: affectedFactIds,
    summary: `${changeId} test change`
  };
}

function branch(id: string, parentBranchId: string | null, rootPageId: string): FixtureRecord {
  return storyRecord("branch_record", id, "branches", {
    id,
    story_id: "STORY-1",
    created_at_page: rootPageId,
    label: id,
    parent_branch_id: parentBranchId,
    forked_at_page_id: parentBranchId === null ? null : "PG-1",
    root_page_id: rootPageId
  });
}

function entity(id: string, createdAtPage: string, displayName: string): FixtureRecord {
  return storyRecord("story_entity_record", id, "entities", {
    id,
    story_id: "STORY-1",
    created_at_page: createdAtPage,
    display_name: displayName,
    bound_stchar_id: `STCHAR-${id.split("-")[1] ?? "1"}`,
    role_in_story: ["primary_actor"]
  });
}

function storylet(id: string): FixtureRecord {
  return storyRecord("storylet_record", id, "storylets", {
    id,
    story_id: "STORY-1",
    scope: { visibility: "global_author_pool", branch_id: null },
    created_at_page: null,
    title: "Choose",
    move_family: "decision",
    preconditions: { hard: [], soft: [] },
    beats: [{ beat_id: "beat-1", function: "setup", instruction: "Offer a grounded choice." }],
    effects: { create: [], supersede: [], close: [] },
    exit_options: [{ action_family: "decide", surface_hint: "Choose" }],
    saliency: { urgency: "medium", cooldown_pages: 0 },
    mystery_policy: { allowed_authority: "none" },
    provenance: { origin: "author_batch" }
  });
}

function event(
  id: string,
  createdAtPage: string,
  eventKind: "story_start" | "selected_choice",
  actor: string,
  selectedStorylet: string | null,
  rationale = `Drift classification compatible after reviewing CH-2 and CH-3 for ${id}.`
): FixtureRecord {
  return storyRecord("story_event_record", id, "events", {
    id,
    story_id: "STORY-1",
    created_at_page: createdAtPage,
    parent_page_id: eventKind === "story_start" ? null : "PG-1",
    event_kind: eventKind,
    actor,
    commitment: {
      selected_slt_id: selectedStorylet,
      selection_source: selectedStorylet === null ? "none" : "emitted_choice",
      alias_bindings: {}
    },
    outcome_route: "accept",
    world_logic_rationale: rationale,
    state_delta: { create: [], supersede: [], close: [] },
    promotion_claims: []
  });
}

function belief(
  id: string,
  createdAtPage: string,
  holder: string,
  truthRelation: string,
  visibility: string,
  accessRecords: string[]
): FixtureRecord {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    story_id: "STORY-1",
    created_at_page: createdAtPage,
    holder,
    claim: `${id} claim`,
    belief_mode: truthRelation === "false" ? "believes" : "knows",
    truth_relation: truthRelation,
    confidence: "high",
    visibility,
    basis: {
      source_event: "SE-1",
      access_route: "authorial_initialization",
      access_records: accessRecords
    },
    consequences: { opens: [], constrains_choices: [] }
  });
}

function fact(id: string, createdAtPage: string, authority: string, derivedFrom: string[]): FixtureRecord {
  return storyRecord("story_fact_record", id, "facts", {
    id,
    story_id: "STORY-1",
    created_at_page: createdAtPage,
    statement: `${id} statement`,
    authority,
    derived_from: derivedFrom
  });
}

function choice(id: string, createdAtPage: string, groundedRecords: string[]): FixtureRecord {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    created_at_page: createdAtPage,
    surface_label: "Proceed",
    player_visible_intent: "Proceed with the known option.",
    target_or_action_families: ["decide"],
    likely_state_pressure: "A decision is made.",
    associated_commitment_block: "SLT-1",
    grounded_in: { records: groundedRecords, affordance_ordinals: [] },
    success_policy: "Accept the choice."
  });
}

function page(
  id: string,
  branchId: string,
  parentPageId: string | null,
  resolvedEventId: string,
  choiceId: string | null,
  branchPath: string[],
  activeFacts: string[],
  parentSnapshotCompatibility: string
): FixtureRecord {
  return storyRecord("page_record", id, "pages", {
    id,
    story_id: "STORY-1",
    branch_id: branchId,
    parent_page_id: parentPageId,
    branch_path: branchPath,
    turn_index: id === "PG-1" ? 0 : 1,
    input: {
      choice_id: choiceId,
      manual_action_text: null,
      resolved_event_id: resolvedEventId
    },
    state_hash_parent: null,
    state_hash: "a".repeat(64),
    state_snapshot: {
      canon_revision: "CH-1",
      active_records: { SF: activeFacts },
      entity_status: {},
      unresolved_mystery_claims: [],
      visible_affordances: [],
      continuation: { has_eligible_commitment_block: false, terminal_status: "open", terminal_rationale: null }
    },
    plan: { plan_hash: "b".repeat(64) },
    prose_plan_path: `pages-prose-plans/${id}.md`,
    emitted_choices: choiceId === null ? [] : [choiceId],
    validation_trace: {
      input_legality: "PASS",
      parent_snapshot_compatibility: parentSnapshotCompatibility,
      mystery_invariant_firewall: "PASS",
      branch_isolation: "PASS",
      append_only_delta: "PASS",
      consequence_or_terminal: "PASS",
      plan_grounding: "PASS",
      canon_promotion_hold: "PASS"
    }
  });
}

function validCanonFact(): Record<string, unknown> {
  return {
    id: "CF-1",
    title: "Grounded Institution",
    status: "hard_canon",
    type: "institution",
    statement: "The test world has a small ward office.",
    scope: { geographic: "local", temporal: "current", social: "public" },
    truth_scope: { world_level: true, diegetic_status: "objective" },
    domains_affected: ["law"],
    prerequisites: ["appointed wardens"],
    distribution: {
      who_can_do_it: ["wardens"],
      who_cannot_easily_do_it: ["travelers"],
      why_not_universal: ["requires appointment"]
    },
    costs_and_limits: ["requires time"],
    visible_consequences: ["public records exist"],
    required_world_updates: ["INSTITUTIONS"],
    source_basis: { direct_user_approval: true, derived_from: [] },
    contradiction_risk: { hard: false, soft: false },
    notes: "None",
    extensions: []
  };
}

function validSection(): Record<string, unknown> {
  return {
    id: "SEC-INS-001",
    file_class: "INSTITUTIONS",
    order: 1,
    heading: "Ward Office",
    heading_level: 2,
    body: "The ward office keeps public records.",
    extensions: [],
    touched_by_cf: ["CF-1"]
  };
}
