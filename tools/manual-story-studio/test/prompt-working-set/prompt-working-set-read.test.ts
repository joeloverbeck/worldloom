import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { readPromptWorkingSet } from "../../src/read/prompt-working-set.js";

const FIXTURES_ROOT = path.resolve("test/prompt-working-set/fixtures");
const LEGACY_REVIEW_KEY = ["last", "reviewed", "after", "segment"].join("_");

test("readPromptWorkingSet: absent file returns a typed null value", () => {
  const result = readPromptWorkingSet(path.join(FIXTURES_ROOT, "absent"));

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value, null);
  }
});

test("readPromptWorkingSet: corrupt YAML returns prompt-working-set-yaml-parse-failed", () => {
  const result = readPromptWorkingSet(path.join(FIXTURES_ROOT, "corrupted"));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "prompt-working-set-yaml-parse-failed");
    assert.match(result.error.path, /prompt-working-set\.yaml$/);
    assert.match(result.error.repair_hint, /Fix YAML syntax/);
  }
});

test("readPromptWorkingSet: existing file parses to PromptWorkingSet shape", () => {
  const result = readPromptWorkingSet(path.join(FIXTURES_ROOT, "present"));

  assert.equal(result.ok, true);
  if (result.ok) {
    if (result.value === null) {
      assert.fail("Expected present fixture to parse to PromptWorkingSet.");
    }
    const ctx = result.value;

    assert.deepEqual(Object.keys(ctx).sort(), [
      "active_pressure_clocks",
      "active_secrets_questions",
      "current_cast",
      "current_handoff_summary",
      "current_location",
      "last_accepted_segment",
      "must_not_reveal",
      "pinned_records",
      "pov_holder",
    ]);
    assert.equal(ctx.current_location, "mloc-2");
    assert.deepEqual(ctx.current_cast, ["mchar-1", "mchar-3"]);
    assert.equal(ctx.pov_holder, "mchar-1");
    assert.deepEqual(ctx.active_pressure_clocks, ["mclock-1"]);
    assert.deepEqual(ctx.active_secrets_questions, ["msecret-2", "mq-1"]);
    assert.deepEqual(ctx.pinned_records, ["mrel-4", "mobl-1"]);
    assert.deepEqual(ctx.must_not_reveal, ["msecret-2"]);
    assert.match(ctx.current_handoff_summary, /riverhouse/);
    assert.equal(ctx.last_accepted_segment, "SEG-7");
  }
});

test("readPromptWorkingSet: strips legacy reviewed segment marker", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "manual-studio-prompt-working-set-read-"));
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(
      path.join(root, "prompt-working-set.yaml"),
      YAML.stringify({
        current_location: null,
        current_cast: [],
        pov_holder: null,
        active_pressure_clocks: [],
        active_secrets_questions: [],
        pinned_records: [],
        must_not_reveal: [],
        current_handoff_summary: "",
        last_accepted_segment: null,
        [LEGACY_REVIEW_KEY]: "SEG-7",
      }),
    );

    const result = readPromptWorkingSet(root);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.notEqual(result.value, null);
      assert.equal(
        Object.hasOwn(
          result.value as unknown as Record<string, unknown>,
          LEGACY_REVIEW_KEY,
        ),
        false,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
