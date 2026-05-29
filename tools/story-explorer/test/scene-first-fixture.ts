import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

// A single self-describing seed for the SPEC-96 scene-first capstone. Every
// expected count consumed by a test is re-enumerated from these structures
// (see buildExpectations) rather than hardcoded, so the assertions stay valid
// as the seed evolves. The fixture is always written into an mkdtempSync temp
// dir — the real `worlds/<slug>/` tree is never touched.

const WORLD_SLUG = "fixture-world";
const STORY_SLUG = "red-bunny";

interface PageSeed {
  id: string;
  branchId: string;
  parentPageId: string | null;
  branchPath: string[];
  turnIndex: number;
  choiceId: string | null;
  resolvedEventId: string | null;
  activeRecords: Record<string, string[]>;
  emittedChoices: string[];
  terminalStatus: string;
  stateHash?: string;
  parentStateHash?: string;
  visibleAffordances?: string[];
  unresolvedMysteryClaims?: string[];
}

interface ChoiceSeed {
  id: string;
  surfaceLabel: string;
  playerVisibleIntent: string;
  pressure: string[];
  groundedIn: string[];
}

interface EventSeed {
  id: string;
  create: string[];
  supersede: string[];
  close: string[];
  introduced: string[];
  relations: Array<{ type: string }>;
  feedback: string;
}

interface SceneSeed {
  scene_id: string;
  branch_id: string;
  supersedes: string | null;
  superseded: boolean;
  pg_ids: string[];
  artifact_availability: {
    plan_present: boolean;
    prose_present: boolean;
    receipt_present: boolean;
    receipt_verdict: "PASS" | "WARN" | "FAIL" | null;
  };
  publication_indicator: string;
}

interface BranchCoverageSeed {
  branchId: string;
  activeSceneIds: string[];
  supersededSceneIds: string[];
  unscenedRanges: Array<{ start_pg: string; end_pg: string; pg_ids: string[] }>;
  pgSceneLookup: Record<string, string[]>;
  scenes: SceneSeed[];
}

const PAGES: PageSeed[] = [
  {
    id: "PG-1",
    branchId: "BR-1",
    parentPageId: null,
    branchPath: ["PG-1"],
    turnIndex: 0,
    choiceId: null,
    resolvedEventId: "SE-1",
    activeRecords: { STENT: ["STENT-1"] },
    emittedChoices: ["CHC-1", "CHC-2"],
    terminalStatus: "open",
  },
  {
    id: "PG-2",
    branchId: "BR-1",
    parentPageId: "PG-1",
    branchPath: ["PG-1", "PG-2"],
    turnIndex: 1,
    choiceId: "CHC-1",
    resolvedEventId: "SE-2",
    activeRecords: { STENT: ["STENT-1"], BEL: ["BEL-1"] },
    emittedChoices: ["CHC-3"],
    terminalStatus: "open",
    stateHash: "state-hash-2",
    parentStateHash: "state-hash-1",
    visibleAffordances: ["inspect-key"],
    unresolvedMysteryClaims: ["M-7"],
  },
  {
    id: "PG-3",
    branchId: "BR-1",
    parentPageId: "PG-2",
    branchPath: ["PG-1", "PG-2", "PG-3"],
    turnIndex: 2,
    choiceId: "CHC-3",
    resolvedEventId: "SE-3",
    activeRecords: { BEL: ["BEL-1"], OBL: ["OBL-1"] },
    emittedChoices: [],
    terminalStatus: "open",
  },
  {
    id: "PG-4",
    branchId: "BR-2",
    parentPageId: "PG-1",
    branchPath: ["PG-1", "PG-4"],
    turnIndex: 1,
    choiceId: "CHC-2",
    resolvedEventId: null,
    activeRecords: {},
    emittedChoices: ["CHC-4"],
    terminalStatus: "open",
  },
  {
    id: "PG-5",
    branchId: "BR-2",
    parentPageId: "PG-4",
    branchPath: ["PG-1", "PG-4", "PG-5"],
    turnIndex: 2,
    choiceId: "CHC-4",
    resolvedEventId: null,
    activeRecords: {},
    emittedChoices: [],
    terminalStatus: "branch_pause",
  },
];

const CHOICES: ChoiceSeed[] = [
  {
    id: "CHC-1",
    surfaceLabel: "Open the red door",
    playerVisibleIntent: "Investigate the pressure",
    pressure: ["secret"],
    groundedIn: ["STENT-1"],
  },
  { id: "CHC-2", surfaceLabel: "Leave the threshold", playerVisibleIntent: "Withdraw", pressure: [], groundedIn: [] },
  {
    id: "CHC-3",
    surfaceLabel: "Follow the unscened clue",
    playerVisibleIntent: "Keep investigating",
    pressure: ["obligation"],
    groundedIn: ["OBL-1"],
  },
  { id: "CHC-4", surfaceLabel: "Wait in the dark", playerVisibleIntent: "Hold position", pressure: [], groundedIn: [] },
];

const EVENTS: EventSeed[] = [
  { id: "SE-1", create: ["STENT-1"], supersede: [], close: [], introduced: ["STENT-1"], relations: [], feedback: "A red bunny appears." },
  {
    id: "SE-2",
    create: ["BEL-1"],
    supersede: ["STENT-1"],
    close: [],
    introduced: ["BEL-1"],
    relations: [{ type: "reveals" }],
    feedback: "The key glints under the mat.",
  },
  {
    id: "SE-3",
    create: ["OBL-1"],
    supersede: [],
    close: [],
    introduced: ["OBL-1"],
    relations: [{ type: "creates_pressure" }],
    feedback: "A debt comes due.",
  },
];

const ENTITY_IDS = ["STENT-1"];

const COVERAGE: BranchCoverageSeed[] = [
  {
    branchId: "BR-1",
    activeSceneIds: ["SCN-1"],
    supersededSceneIds: ["SCN-0"],
    unscenedRanges: [{ start_pg: "PG-3", end_pg: "PG-3", pg_ids: ["PG-3"] }],
    pgSceneLookup: { "PG-1": ["SCN-1"], "PG-2": ["SCN-1"], "PG-3": [] },
    scenes: [
      {
        scene_id: "SCN-0",
        branch_id: "BR-1",
        supersedes: null,
        superseded: true,
        pg_ids: ["PG-1"],
        artifact_availability: { plan_present: true, prose_present: true, receipt_present: true, receipt_verdict: "WARN" },
        publication_indicator: "superseded",
      },
      {
        scene_id: "SCN-1",
        branch_id: "BR-1",
        supersedes: "SCN-0",
        superseded: false,
        pg_ids: ["PG-1", "PG-2"],
        artifact_availability: { plan_present: true, prose_present: true, receipt_present: true, receipt_verdict: "PASS" },
        publication_indicator: "attached:PASS",
      },
    ],
  },
  {
    branchId: "BR-2",
    activeSceneIds: ["SCN-2", "SCN-3"],
    supersededSceneIds: [],
    unscenedRanges: [],
    pgSceneLookup: { "PG-4": ["SCN-2"], "PG-5": ["SCN-3"] },
    scenes: [
      {
        scene_id: "SCN-2",
        branch_id: "BR-2",
        supersedes: null,
        superseded: false,
        pg_ids: ["PG-4"],
        artifact_availability: { plan_present: true, prose_present: false, receipt_present: false, receipt_verdict: null },
        publication_indicator: "planned",
      },
      {
        scene_id: "SCN-3",
        branch_id: "BR-2",
        supersedes: null,
        superseded: false,
        pg_ids: ["PG-5"],
        artifact_availability: { plan_present: true, prose_present: true, receipt_present: false, receipt_verdict: null },
        publication_indicator: "prose-present",
      },
    ],
  },
];

// The one scene whose plan/prose/receipt files exist on disk (artifact-route proof).
const PROSE_BACKED_SCENE_ID = "SCN-1";

export interface SceneFirstExpectations {
  worldSlug: string;
  storySlug: string;
  pageCount: number;
  choiceCount: number;
  branchCount: number;
  branchIds: string[];
  activeSceneCount: number;
  supersededSceneCount: number;
  totalSceneCount: number;
  unscenedRunCount: number;
  unscenedPageCount: number;
  publicationStates: string[];
  proseBackedSceneId: string;
}

function buildExpectations(): SceneFirstExpectations {
  const branchIds = [...new Set(PAGES.map((page) => page.branchId))].sort((left, right) => left.localeCompare(right));
  const choiceIds = new Set(PAGES.map((page) => page.choiceId).filter((id): id is string => id !== null));
  const activeSceneCount = COVERAGE.reduce((count, branch) => count + branch.activeSceneIds.length, 0);
  const supersededSceneCount = COVERAGE.reduce((count, branch) => count + branch.supersededSceneIds.length, 0);
  const unscenedRanges = COVERAGE.flatMap((branch) => branch.unscenedRanges);
  const publicationStates = [
    ...new Set(COVERAGE.flatMap((branch) => branch.scenes.map((scene) => scene.publication_indicator))),
  ].sort((left, right) => left.localeCompare(right));

  return {
    worldSlug: WORLD_SLUG,
    storySlug: STORY_SLUG,
    pageCount: PAGES.length,
    choiceCount: choiceIds.size,
    branchCount: branchIds.length,
    branchIds,
    activeSceneCount,
    supersededSceneCount,
    totalSceneCount: activeSceneCount + supersededSceneCount,
    unscenedRunCount: unscenedRanges.length,
    unscenedPageCount: unscenedRanges.reduce((count, range) => count + range.pg_ids.length, 0),
    publicationStates,
    proseBackedSceneId: PROSE_BACKED_SCENE_ID,
  };
}

function insertNode(db: Database.Database, recordId: string, sourceDir: string, nodeType: string, body: string): void {
  const filePath = `stories/${STORY_SLUG}/_source/${sourceDir}/${recordId}.yaml`;
  db.prepare(
    `
      INSERT INTO nodes (
        node_id, world_slug, file_path, heading_path, byte_start, byte_end,
        line_start, line_end, node_type, body, content_hash, anchor_checksum,
        summary, created_at_index_version, story_slug
      )
      VALUES (?, '${WORLD_SLUG}', ?, NULL, 0, 0, 1, 1, ?, ?, 'hash', 'anchor', NULL, 1, '${STORY_SLUG}')
    `,
  ).run(`${STORY_SLUG}:${recordId}`, filePath, nodeType, body);
  db.prepare(
    `
      INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
      VALUES ('${WORLD_SLUG}', ?, 'hash', '2026-05-29T00:00:00.000Z')
    `,
  ).run(filePath);
}

function insertEdge(db: Database.Database, source: string, target: string, edgeType: string): void {
  db.prepare(
    `
      INSERT INTO edges (source_node_id, target_node_id, target_unresolved_ref, edge_type, story_slug)
      VALUES (?, ?, NULL, ?, '${STORY_SLUG}')
    `,
  ).run(`${STORY_SLUG}:${source}`, `${STORY_SLUG}:${target}`, edgeType);
}

function insertCoverageRow(db: Database.Database, branch: BranchCoverageSeed): void {
  db.prepare(
    `
      INSERT INTO scene_coverage (
        world_slug, story_slug, branch_id, active_scene_ids_json,
        superseded_scene_ids_json, unscened_ranges_json, pg_scene_lookup_json,
        scenes_json, refreshed_at
      ) VALUES ('${WORLD_SLUG}', '${STORY_SLUG}', ?, ?, ?, ?, ?, ?, '2026-05-29T00:00:00.000Z')
    `,
  ).run(
    branch.branchId,
    JSON.stringify(branch.activeSceneIds),
    JSON.stringify(branch.supersededSceneIds),
    JSON.stringify(branch.unscenedRanges),
    JSON.stringify(branch.pgSceneLookup),
    JSON.stringify(branch.scenes),
  );
}

function pageRecordBody(page: PageSeed): Record<string, unknown> {
  const stateSnapshot: Record<string, unknown> = {
    active_records: page.activeRecords,
    continuation: { terminal_status: page.terminalStatus },
  };
  if (page.stateHash !== undefined) {
    stateSnapshot.state_hash = page.stateHash;
  }
  if (page.parentStateHash !== undefined) {
    stateSnapshot.parent_state_hash = page.parentStateHash;
  }
  if (page.visibleAffordances !== undefined) {
    stateSnapshot.visible_affordances = page.visibleAffordances;
  }
  if (page.unresolvedMysteryClaims !== undefined) {
    stateSnapshot.unresolved_mystery_claims = page.unresolvedMysteryClaims;
  }

  return {
    id: page.id,
    story_id: "STORY-1",
    branch_id: page.branchId,
    parent_page_id: page.parentPageId,
    branch_path: page.branchPath,
    turn_index: page.turnIndex,
    input: { choice_id: page.choiceId, manual_action_text: null, resolved_event_id: page.resolvedEventId },
    state_snapshot: stateSnapshot,
    emitted_choices: page.emittedChoices,
    validation_trace: { checks: [{ name: "capstone", verdict: "PASS", rationale: "Fixture route proof." }] },
  };
}

export interface SceneFirstFixture {
  repoRoot: string;
  storyRoot: string;
  expected: SceneFirstExpectations;
}

export function seedSceneFirstFixture(): SceneFirstFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-capstone-"));
  const storyRoot = path.join(repoRoot, "worlds", WORLD_SLUG, "stories", STORY_SLUG);
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "choices", "events", "entities", "scenes"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  for (const subdir of ["scene-prose-plans", "scene-prose", "scene-prose-receipts"]) {
    mkdirSync(path.join(storyRoot, subdir), { recursive: true });
  }
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );

  const db = openIndex(repoRoot, WORLD_SLUG);

  const writeRecord = (sourceDir: string, recordId: string, body: Record<string, unknown>, nodeType: string): void => {
    const serialized = YAML.stringify(body);
    writeFileSync(path.join(storyRoot, "_source", sourceDir, `${recordId}.yaml`), serialized, "utf8");
    insertNode(db, recordId, sourceDir, nodeType, serialized);
  };

  for (const page of PAGES) {
    writeRecord("pages", page.id, pageRecordBody(page), "page_record");
  }
  for (const choice of CHOICES) {
    writeRecord(
      "choices",
      choice.id,
      {
        id: choice.id,
        surface_label: choice.surfaceLabel,
        player_visible_intent: choice.playerVisibleIntent,
        likely_state_pressure: choice.pressure,
        grounded_in: choice.groundedIn,
      },
      "choice_record",
    );
  }
  for (const event of EVENTS) {
    writeRecord(
      "events",
      event.id,
      {
        id: event.id,
        state_delta: { create: event.create, supersede: event.supersede, close: event.close },
        record_introductions: event.introduced.map((recordId) => ({ record_id: recordId })),
        state_relations: event.relations,
        resolution: { player_visible_feedback: event.feedback },
      },
      "story_event_record",
    );
  }
  for (const entityId of ENTITY_IDS) {
    writeRecord("entities", entityId, { id: entityId, display_name: "Red Bunny" }, "story_entity_record");
  }
  writeRecord(
    "scenes",
    PROSE_BACKED_SCENE_ID,
    { id: PROSE_BACKED_SCENE_ID, story_id: "STORY-1", branch_id: "BR-1", pg_ids: ["PG-1", "PG-2"] },
    "scene_record",
  );

  // Provenance edges for STENT-1: created by SE-1, modified (superseded) by SE-2.
  insertEdge(db, "SE-1", "STENT-1", "state_delta_create");
  insertEdge(db, "SE-2", "STENT-1", "state_delta_supersede");
  insertEdge(db, "STENT-1", "SE-1", "creation_evidence");

  for (const branch of COVERAGE) {
    insertCoverageRow(db, branch);
  }
  db.close();

  writeFileSync(path.join(storyRoot, "scene-prose-plans", `${PROSE_BACKED_SCENE_ID}.md`), "Scene plan body\n", "utf8");
  writeFileSync(path.join(storyRoot, "scene-prose", `${PROSE_BACKED_SCENE_ID}.md`), "Rendered scene prose.\n", "utf8");
  writeFileSync(
    path.join(storyRoot, "scene-prose-receipts", `${PROSE_BACKED_SCENE_ID}.yaml`),
    YAML.stringify({ verdict: "PASS", state_hash: "state-hash" }),
    "utf8",
  );

  return { repoRoot, storyRoot, expected: buildExpectations() };
}

// A story present on disk but with no built index, so resolveIndexStatus()
// reports `missing` and every scene-first route must take its degraded path.
export function seedMissingIndexFixture(): { repoRoot: string; storyRoot: string } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-capstone-missing-index-"));
  const storyRoot = path.join(repoRoot, "worlds", WORLD_SLUG, "stories", STORY_SLUG);
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );

  const degradedPages: PageSeed[] = [
    {
      id: "PG-1",
      branchId: "BR-1",
      parentPageId: null,
      branchPath: ["PG-1"],
      turnIndex: 0,
      choiceId: null,
      resolvedEventId: null,
      activeRecords: {},
      emittedChoices: ["CHC-1"],
      terminalStatus: "open",
    },
    {
      id: "PG-2",
      branchId: "BR-1",
      parentPageId: "PG-1",
      branchPath: ["PG-1", "PG-2"],
      turnIndex: 1,
      choiceId: "CHC-1",
      resolvedEventId: null,
      activeRecords: {},
      emittedChoices: [],
      terminalStatus: "open",
    },
  ];
  for (const page of degradedPages) {
    writeFileSync(path.join(storyRoot, "_source", "pages", `${page.id}.yaml`), YAML.stringify(pageRecordBody(page)), "utf8");
  }

  return { repoRoot, storyRoot };
}
