import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runValidators } from "../../src/framework/run.js";
import type { Context, IndexedRecord, Validator, Verdict } from "../../src/framework/types.js";
import { activePressureHandlingDiscipline } from "../../src/structural/active-pressure-handling-discipline.js";
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

interface ClockFireFixture {
  world_slug: string;
  story_slug: string;
  records: FixtureRecord[];
  files: FixtureFile[];
}

const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "../../../tests/fixtures/clock-fire-route-closes/fixture.json"
);
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as ClockFireFixture;

const SPEC85_CLOCK_VALIDATORS: readonly Validator[] = [
  turnDriverSchemaCompliance,
  turnDriverPovObserverFirewall,
  pagePlanTurnDriverConsistency,
  activePressureHandlingDiscipline,
  observerFirewall,
  turnCycleOutputGroundingIntegrity
];

test("SPEC-85 clock-fire route-closes fixture passes the composed turn-driver validators", async () => {
  const root = materializeFixture();

  try {
    const run = await runValidators(SPEC85_CLOCK_VALIDATORS, input(), testContext());

    assert.deepEqual(run.verdicts, []);
    assert.deepEqual(run.summary.validators_run, SPEC85_CLOCK_VALIDATORS.map((validator) => validator.name));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SPEC-85 clock-fire route-closes variants produce the expected capstone verdicts", async () => {
  await assertCodes(
    "empty driver records",
    (records) => {
      (event(records).parsed as { turn_driver: { driver_records: string[] } }).turn_driver.driver_records = [];
    },
    [
      "turn_driver_driver_records_empty_for_non_player",
      "turn_driver_initiator_pattern_violation"
    ]
  );

  await assertCodes(
    "missing clock pressure row",
    undefined,
    ["high_urgency_active_record_unhandled"],
    planWithoutClockPressureRow()
  );

  await assertCodes(
    "response choice grounded away from clock",
    (records) => {
      (recordById(records, "CHC-1").parsed as { grounded_in: { records: string[] } }).grounded_in.records = ["BEL-1"];
    },
    ["chc_response_topical_grounding_missing"]
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
  const run = await runValidators(SPEC85_CLOCK_VALIDATORS, { files: [{ path: planPath(), content: planContent }] }, testContext(records));
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

function planWithoutClockPressureRow(): string {
  return canonicalPlan().replace("| CLK-1 | selected | toll-gate clock reached the route-closing threshold |\n", "");
}

function event(records: IndexedRecord[]): IndexedRecord {
  return recordById(records, "SE-1");
}

function recordById(records: IndexedRecord[], id: string): IndexedRecord {
  const found = records.find((record) => (record.parsed as { id?: unknown }).id === id);
  assert.ok(found, `expected fixture record ${id}`);
  return found;
}

function materializeFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "clock-fire-route-closes-"));
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
