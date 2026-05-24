import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

/*
SPEC-79 manual dry-run runbook for §9 tests 4-5:

1. Copy a fixture world to a temporary root before invoking authoring skills. Do
   not run either skill against a live canon tree.
2. Invoke /branching-story-bootstrap against the temporary world. Inspect the
   produced CHC records and confirm they omit the retired CHC-to-SLT field, then
   run the shared hard-gate validation path for the produced bundle.
3. Invoke /branching-story-turn-cycle against the bootstrapped page. Confirm
   Phase 2 chooses an SLT from the live pool using the selected PG input,
   grounded_in.records, and target_or_action_families. Confirm Phase 8 emits new
   CHCs without the retired CHC-to-SLT field.
4. Run snapshot_replay_equality against the resulting state and confirm replay
   equivalence.

The executable subtest below covers §9 test 6: no tracked operational consumer
surface may still reference the retired CHC-to-SLT field after the removal.
*/

const NEEDLE = ["associated", "commitment", "block"].join("_");
const SEARCH_PATHS = [
  "tools",
  ".claude/skills",
  "docs",
  "specs/SPEC-79-chc-associated-commitment-block-removal.md",
  "reports/slt-chc-overhaul-second-iteration.md"
] as const;

const ALLOWED_HISTORICAL_PATHS = new Set([
  "docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md",
  "docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md",
  "reports/slt-chc-overhaul-second-iteration.md",
  "specs/SPEC-79-chc-associated-commitment-block-removal.md"
]);

test("SPEC-79 capstone: tracked operational surfaces do not retain the retired CHC-to-SLT field", () => {
  const run = spawnSync("git", ["grep", "-n", NEEDLE, "--", ...SEARCH_PATHS], {
    cwd: repoRoot(),
    encoding: "utf8"
  });

  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 0, formatRun(run));

  const matches = parseGitGrep(run.stdout);
  assert.ok(matches.length > 0, "Expected SPEC-79 provenance hits to keep the grep assertion honest.");
  assert.deepEqual(
    matches.filter((match) => !ALLOWED_HISTORICAL_PATHS.has(match.path)),
    [],
    `Unexpected current-surface ${NEEDLE} hits:\n${matches.map((match) => match.raw).join("\n")}`
  );
});

interface GitGrepMatch {
  path: string;
  raw: string;
}

function parseGitGrep(stdout: string): GitGrepMatch[] {
  return stdout.trim().split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const separator = line.indexOf(":");
      assert.notEqual(separator, -1, `Malformed git grep line: ${line}`);
      return {
        path: line.slice(0, separator),
        raw: line
      };
    });
}

function repoRoot(): string {
  return path.resolve(process.cwd(), "../..");
}

function formatRun(run: ReturnType<typeof spawnSync>): string {
  return [
    `status: ${String(run.status)}`,
    `signal: ${String(run.signal)}`,
    `stdout:\n${run.stdout || "<empty>"}`,
    `stderr:\n${run.stderr || "<empty>"}`
  ].join("\n");
}
