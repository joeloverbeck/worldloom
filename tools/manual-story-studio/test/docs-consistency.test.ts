import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..");

test("docs/manual-story-studio/README.md does not reference manual-render-instruction.md (SPEC-107 regression guard)", () => {
  const readme = readFileSync(
    path.join(REPO_ROOT, "docs/manual-story-studio/README.md"),
    "utf8",
  );
  assert.ok(
    !readme.includes("manual-render-instruction.md"),
    "README must not re-introduce the missing-file claim without also landing the file (SPEC-107 fewer-docs path)",
  );
});
