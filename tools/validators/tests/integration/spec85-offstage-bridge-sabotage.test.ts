import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runValidators } from "../../src/framework/run.js";
import type { Context, IndexedRecord, Validator, Verdict } from "../../src/framework/types.js";
import { observerFirewall } from "../../src/structural/observer-firewall.js";
import { pagePlanTurnDriverConsistency } from "../../src/structural/page-plan-turn-driver-consistency.js";
import { turnCycleOutputGroundingIntegrity } from "../../src/structural/turn-cycle-output-grounding-integrity.js";
import { turnDriverPovObserverFirewall } from "../../src/structural/turn-driver-pov-observer-firewall.js";
import { turnDriverSchemaCompliance } from "../../src/structural/turn-driver-schema-compliance.js";
import { context } from "../structural/helpers.js";

interface FixtureFile {
  path: string;
  content: string;
}

interface FixtureRecord {
  node_type: string;
  node_id: string;
  file_path: string;
  parsed: Record<string, unknown>;
}

interface OffstageFixture {
  world_slug: string;
  story_slug: string;
  records: FixtureRecord[];
  files: FixtureFile[];
}

const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "../../../tests/fixtures/offstage-bridge-sabotage/fixture.json"
);
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as OffstageFixture;

const SPEC85_OFFSTAGE_VALIDATORS: readonly Validator[] = [
  turnDriverSchemaCompliance,
  turnDriverPovObserverFirewall,
  pagePlanTurnDriverConsistency,
  observerFirewall,
  turnCycleOutputGroundingIntegrity
];

test("SPEC-85 offstage bridge-sabotage fixture passes the composed turn-driver validators", async () => {
  const root = materializeFixture();

  try {
    const run = await runValidators(SPEC85_OFFSTAGE_VALIDATORS, input(), testContext());

    assert.deepEqual(run.verdicts, []);
    assert.deepEqual(run.summary.validators_run, SPEC85_OFFSTAGE_VALIDATORS.map((validator) => validator.name));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SPEC-85 offstage bridge-sabotage variants produce the expected capstone verdicts", async () => {
  await assertCodes(
    "offstage perceived directly",
    (records) => {
      (event(records).parsed as { turn_driver: { pov_visibility: string } }).turn_driver.pov_visibility = "perceived_directly";
    },
    [
      "turn_driver_offstage_perceived_directly"
    ]
  );

  await assertCodes(
    "missing access route",
    (records) => {
      (parentPage(records).parsed as { state_snapshot: { active_records: { BEL: string[] } } }).state_snapshot.active_records.BEL = [];
    },
    [
      "turn_driver_missing_access_route"
    ]
  );

  await assertCodes(
    "offstage mind access in page plan",
    undefined,
    ["turn_driver_offstage_direct_mind_access"],
    planWithInteriorLeak()
  );
});

async function assertCodes(
  name: string,
  mutateRecords: ((records: IndexedRecord[]) => void) | undefined,
  expectedCodes: string[],
  planContent = canonicalPlan()
) {
  const records = cloneRecords();
  mutateRecords?.(records);
  const run = await runValidators(SPEC85_OFFSTAGE_VALIDATORS, { files: [{ path: planPath(), content: planContent }] }, testContext(records));
  const codes = run.verdicts.map((verdict) => verdict.code);

  assert.deepEqual(codes, expectedCodes, `${name}: ${formatVerdicts(run.verdicts)}`);
}

function cloneRecords(): IndexedRecord[] {
  return fixture.records.map((item) => ({
    node_type: item.node_type,
    node_id: item.node_id,
    file_path: item.file_path,
    parsed: structuredClone(item.parsed),
    world_slug: fixture.world_slug,
    story_slug: fixture.story_slug
  }));
}

function input() {
  return { files: fixture.files };
}

function testContext(records: IndexedRecord[] = cloneRecords(), overrides: Partial<Context> = {}): Context {
  return context(records, { world_slug: fixture.world_slug, story_slug: fixture.story_slug, ...overrides });
}

function canonicalPlan(): string {
  return fixture.files[0]?.content ?? "";
}

function planPath(): string {
  return fixture.files[0]?.path ?? "";
}

function planWithInteriorLeak(): string {
  return canonicalPlan().replace(
    "- No STCHAR packet required; the driver is an offstage plan surfaced by DA-1 evidence.",
    "- No STCHAR packet required; STENT-2 knew the bridge would fail before the player arrived."
  );
}

function event(records: IndexedRecord[]): IndexedRecord {
  return recordById(records, "SE-1");
}

function parentPage(records: IndexedRecord[]): IndexedRecord {
  return recordById(records, "PG-1");
}

function recordById(records: IndexedRecord[], id: string): IndexedRecord {
  const found = records.find((record) => (record.parsed as { id?: unknown }).id === id);
  assert.ok(found, `expected fixture record ${id}`);
  return found;
}

function materializeFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "offstage-bridge-sabotage-"));
  for (const file of fixture.files) {
    const target = path.join(root, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }
  return root;
}

function formatVerdicts(verdicts: Verdict[]): string {
  return JSON.stringify(verdicts.map((verdict) => ({
    validator: verdict.validator,
    code: verdict.code,
    detail: verdict.detail
  })), null, 2);
}
