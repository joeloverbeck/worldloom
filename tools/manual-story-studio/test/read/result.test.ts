import assert from "node:assert/strict";
import test from "node:test";

import { err, ok, type ReadError, type ReadResult } from "../../src/read/result.js";

test("ok returns a true discriminant with the supplied value", () => {
  const value = { id: "mst-1", title: "Example" };
  const result = ok(value);

  assert.equal(result.ok, true);
  assert.equal(result.value, value);
});

test("err returns a false discriminant with the supplied error", () => {
  const error: ReadError = {
    code: "yaml_parse_failed",
    path: "worlds/example/manual-stories/example/manual-story.yaml",
    repair_hint: "Fix the YAML syntax.",
  };
  const result = err(error);

  assert.equal(result.ok, false);
  assert.equal(result.error, error);
});

test("ReadResult narrows by ok discriminator", () => {
  function describe(result: ReadResult<string>): string {
    if (result.ok) {
      return `value:${result.value}`;
    }

    return `error:${result.error.code}`;
  }

  assert.equal(describe(ok("ready")), "value:ready");
  assert.equal(
    describe(
      err({
        code: "file_not_found",
        path: "worlds/example/manual-stories/example/missing.yaml",
        repair_hint: "Create the missing file.",
      }),
    ),
    "error:file_not_found",
  );
});
