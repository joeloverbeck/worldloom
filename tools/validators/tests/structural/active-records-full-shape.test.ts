import assert from "node:assert/strict";
import test from "node:test";

import { ACTIVE_RECORDS_CLASSES } from "../../src/_helpers/state-snapshot-replay.js";
import { activeRecordsFullShape } from "../../src/structural/active-records-full-shape.js";
import { compatibilityDrift } from "../../src/structural/compatibility-drift.js";
import { context, record } from "./helpers.js";

test("active_records_full_shape is scoped to full-world only", () => {
  assert.equal(activeRecordsFullShape.applies_to(context([])), true);
  assert.equal(activeRecordsFullShape.applies_to(context([], { run_mode: "incremental" })), false);
  assert.equal(activeRecordsFullShape.applies_to(context([], { run_mode: "pre-apply" })), false);
});

test("active_records_full_shape warns once for each missing active-record class", async () => {
  const verdicts = await activeRecordsFullShape.run(undefined, context([
    storyPage("PG-1", activeRecordsWithout("DA", "CLK", "STSEC", "STQ", "STPLAN", "STEMO"))
  ]));

  assert.equal(verdicts.length, 6);
  assert.ok(verdicts.every((verdict) => verdict.validator === "active_records_full_shape"));
  assert.ok(verdicts.every((verdict) => verdict.severity === "warn"));
  assert.deepEqual(missingClasses(verdicts), ["CLK", "DA", "STEMO", "STPLAN", "STQ", "STSEC"]);
});

test("active_records_full_shape reports a single omitted class", async () => {
  const verdicts = await activeRecordsFullShape.run(undefined, context([
    storyPage("PG-1", activeRecordsWithout("STSTAT"))
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "active_records_class_key_missing");
  assert.equal((verdicts[0]?.detail as { missing_class: string }).missing_class, "STSTAT");
  assert.match(verdicts[0]?.message ?? "", /STSTAT/);
});

test("active_records_full_shape accepts the full shape when arrays are populated", async () => {
  const verdicts = await activeRecordsFullShape.run(undefined, context([
    storyPage("PG-1", fullActiveRecords())
  ]));

  assert.deepEqual(verdicts, []);
});

test("active_records_full_shape accepts the full shape when arrays are empty", async () => {
  const verdicts = await activeRecordsFullShape.run(undefined, context([
    storyPage("PG-1", fullActiveRecords({ empty: true }))
  ]));

  assert.deepEqual(verdicts, []);
});

test("active_records_full_shape coexists with compatibility_drift diagnostics", async () => {
  const records = [
    storyPage("PG-1", activeRecordsWithout("DA", "CLK", "STSEC", "STQ", "STPLAN", "STEMO"))
  ];

  const compatibilityVerdicts = await compatibilityDrift.run(undefined, context(records));
  const fullShapeVerdicts = await activeRecordsFullShape.run(undefined, context(records));

  assert.ok(compatibilityVerdicts.some((verdict) => verdict.validator === "compatibility_drift"));
  assert.ok(compatibilityVerdicts.some((verdict) => verdict.code === "compat_missing_active_record_key"));
  assert.equal(fullShapeVerdicts.length, 6);
  assert.deepEqual(missingClasses(fullShapeVerdicts), ["CLK", "DA", "STEMO", "STPLAN", "STQ", "STSEC"]);
});

function storyPage(id: string, activeRecords: Record<string, string[]>) {
  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      state_snapshot: {
        active_records: activeRecords
      }
    }),
    story_slug: "test-story"
  };
}

function fullActiveRecords(options: { empty?: boolean } = {}): Record<string, string[]> {
  return Object.fromEntries(
    ACTIVE_RECORDS_CLASSES.map((recordClass) => [
      recordClass,
      options.empty === true ? [] : [`${recordClass}-1`]
    ])
  );
}

function activeRecordsWithout(...omitted: string[]): Record<string, string[]> {
  const omittedSet = new Set(omitted);
  return Object.fromEntries(
    ACTIVE_RECORDS_CLASSES
      .filter((recordClass) => !omittedSet.has(recordClass))
      .map((recordClass) => [recordClass, [`${recordClass}-1`]])
  );
}

function missingClasses(verdicts: readonly { detail?: unknown }[]): string[] {
  return verdicts
    .map((verdict) => (verdict.detail as { missing_class: string }).missing_class)
    .sort();
}
