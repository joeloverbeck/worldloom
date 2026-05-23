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

interface RedKilnFixture {
  world_slug: string;
  story_slug: string;
  records: FixtureRecord[];
  files: FixtureFile[];
}

const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "../../../tests/fixtures/red-kiln-ambush/fixture.json"
);
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as RedKilnFixture;

const SPEC76_VALIDATORS: readonly Validator[] = [
  turnDriverSchemaCompliance,
  turnDriverPovObserverFirewall,
  pagePlanTurnDriverConsistency,
  activePressureHandlingDiscipline,
  observerFirewall,
  turnCycleOutputGroundingIntegrity
];

test("SPEC-76 Red Kiln Ambush fixture passes the composed turn-driver validators", async () => {
  const root = materializeFixture();

  try {
    const run = await runValidators(SPEC76_VALIDATORS, input(), testContext());

    assert.deepEqual(run.verdicts, []);
    assert.deepEqual(run.summary.validators_run, SPEC76_VALIDATORS.map((validator) => validator.name));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SPEC-76 Red Kiln Ambush variants produce the expected capstone verdicts", async () => {
  await assertCodes(
    "no driver",
    (records) => {
      delete (event(records).parsed as Record<string, unknown>).turn_driver;
    },
    ["turn_driver_missing"]
  );

  await assertCodes(
    "hidden mind leak",
    (records) => {
      const plan = recordById(records, "STPLAN-9");
      (plan.parsed as { scope?: { visibility?: string } }).scope = { visibility: "offstage" };
      const parentPage = recordById(records, "PG-1");
      (parentPage.parsed as { state_snapshot: { active_records: { BEL: string[] } } }).state_snapshot.active_records.BEL = [];
      (event(records).parsed as { turn_driver: { pov_visibility: string } }).turn_driver.pov_visibility = "perceived_directly";
    },
    ["turn_driver_hidden_state_leak"]
  );

  await assertCodes(
    "missing pressure table",
    undefined,
    [
      "page_plan_active_pressure_table_missing",
      "high_urgency_active_record_unhandled",
      "high_urgency_active_record_unhandled",
      "high_urgency_active_record_unhandled",
      "high_urgency_active_record_unhandled"
    ],
    planWithoutPressureTable()
  );

  await assertCodes(
    "mismatched section 7a",
    undefined,
    ["page_plan_driver_kind_mismatch"],
    replacePlanLine("- Driver kind: npc_action", "- Driver kind: offstage_action")
  );

  await assertCodes(
    "wrong response mode",
    (records) => {
      for (const choice of records.filter((record) => record.node_type === "choice_record")) {
        (choice.parsed as Record<string, unknown>).player_response_mode = "initiates";
      }
    },
    [
      "chc_non_player_driver_response_mode_invalid",
      "chc_non_player_driver_response_mode_invalid",
      "chc_non_player_driver_response_mode_invalid",
      "chc_non_player_driver_response_mode_invalid",
      "chc_non_player_driver_response_mode_invalid"
    ]
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
  const run = await runValidators(SPEC76_VALIDATORS, { files: [{ path: planPath(), content: planContent }] }, testContext(records));
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

function replacePlanLine(before: string, after: string): string {
  return canonicalPlan().replace(before, after);
}

function planWithoutPressureTable(): string {
  return canonicalPlan().replace(
    /\nActive-pressure disposition\n\n\| Record \| Disposition \| Reason \/ expiry \|\n\|---\|---\|---\|\n(?:\|.*\|\n)+/,
    "\n"
  );
}

function event(records: IndexedRecord[]): IndexedRecord {
  return recordById(records, "SE-2");
}

function recordById(records: IndexedRecord[], id: string): IndexedRecord {
  const found = records.find((record) => (record.parsed as { id?: unknown }).id === id);
  assert.ok(found, `expected fixture record ${id}`);
  return found;
}

function materializeFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "red-kiln-ambush-"));
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
