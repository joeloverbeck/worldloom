import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { readCurrentContext } from "../../src/read/current-context.js";

const FIXTURES_ROOT = path.resolve("test/current-context/fixtures");

test("readCurrentContext: absent file returns a typed null value", () => {
  const result = readCurrentContext(path.join(FIXTURES_ROOT, "absent"));

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value, null);
  }
});

test("readCurrentContext: corrupt YAML returns current-context-yaml-parse-failed", () => {
  const result = readCurrentContext(path.join(FIXTURES_ROOT, "corrupted"));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "current-context-yaml-parse-failed");
    assert.match(result.error.path, /current-context\.yaml$/);
    assert.match(result.error.repair_hint, /Fix YAML syntax/);
  }
});

test("readCurrentContext: existing file parses to CurrentContext shape", () => {
  const result = readCurrentContext(path.join(FIXTURES_ROOT, "present"));

  assert.equal(result.ok, true);
  if (result.ok) {
    if (result.value === null) {
      assert.fail("Expected present fixture to parse to CurrentContext.");
    }
    const ctx = result.value;

    assert.deepEqual(Object.keys(ctx).sort(), [
      "active_pressure_clocks",
      "active_secrets_questions",
      "current_cast",
      "current_handoff_summary",
      "current_location",
      "last_accepted_segment",
      "last_reviewed_after_segment",
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
    assert.equal(ctx.last_reviewed_after_segment, "SEG-7");
  }
});
