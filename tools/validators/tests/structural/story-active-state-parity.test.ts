import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { STATE_DELTA_CLASSES } from "../../src/structural/state-delta-class-integrity.js";

const STATE_DELTA_KEYS = ["create", "supersede", "close"] as const;

test("active-state record class surfaces stay in parity", () => {
  const pageSchema = loadSchema("story-page.schema.json");
  const eventSchema = loadSchema("story-event.schema.json");
  const activeRecordClasses = objectKeysAt(pageSchema, [
    "properties",
    "state_snapshot",
    "properties",
    "active_records",
    "properties"
  ]);
  const validatorClasses = [...STATE_DELTA_CLASSES].sort();

  assert.deepEqual(activeRecordClasses, validatorClasses);

  for (const key of STATE_DELTA_KEYS) {
    const eventDeltaClasses = classesFromPattern(stringAt(eventSchema, [
      "properties",
      "state_delta",
      "properties",
      key,
      "items",
      "pattern"
    ]));

    assert.deepEqual(eventDeltaClasses, validatorClasses, `state_delta.${key} pattern`);
  }
});

function loadSchema(fileName: string): unknown {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", fileName), "utf8"));
}

function objectKeysAt(value: unknown, pathParts: readonly string[]): string[] {
  const target = valueAt(value, pathParts);
  assertPlainRecord(target, pathParts);
  return Object.keys(target).sort();
}

function stringAt(value: unknown, pathParts: readonly string[]): string {
  const target = valueAt(value, pathParts);
  assertString(target, pathParts);
  return target;
}

function valueAt(value: unknown, pathParts: readonly string[]): unknown {
  let current = value;

  for (const part of pathParts) {
    assertPlainRecord(current, pathParts);
    current = current[part];
  }

  return current;
}

function assertPlainRecord(value: unknown, pathParts: readonly string[]): asserts value is Record<string, unknown> {
  assert.equal(typeof value, "object", `${pathParts.join(".")} should be an object`);
  assert.notEqual(value, null, `${pathParts.join(".")} should not be null`);
  assert.equal(Array.isArray(value), false, `${pathParts.join(".")} should not be an array`);
}

function assertString(value: unknown, pathParts: readonly string[]): asserts value is string {
  assert.equal(typeof value, "string", `${pathParts.join(".")} should be a string`);
}

function classesFromPattern(pattern: string): string[] {
  const match = /^\^\(([^)]+)\)-\[0-9\]\+\$$/.exec(pattern);
  assert.ok(match, `unexpected state_delta pattern: ${pattern}`);
  const classList = match[1];
  assertString(classList, ["state_delta", "pattern", "class_list"]);
  return classList.split("|").sort();
}
