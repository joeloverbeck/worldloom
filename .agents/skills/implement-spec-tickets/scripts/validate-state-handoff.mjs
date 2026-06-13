#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const statePath = ".codex/run-state/implement-spec-tickets.json";

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status === 0) {
    return result.stdout.trim();
  }

  const detail = result.stderr || result.error?.message || `git ${args.join(" ")} failed`;
  throw new Error(detail);
}

function tryGit(args) {
  try {
    return { ok: true, stdout: git(args) };
  } catch (error) {
    return {
      ok: false,
      stderr: String(error.stderr || error.message || error),
    };
  }
}

function readCommittedState() {
  const committed = tryGit(["show", `HEAD:${statePath}`]);
  if (committed.ok) {
    return { source: "HEAD", text: committed.stdout };
  }

  return {
    source: "worktree",
    text: readFileSync(resolve(statePath), "utf8"),
  };
}

function isReachableCommit(value) {
  if (!value || value === "none" || value === "self") {
    return true;
  }

  return tryGit(["cat-file", "-e", `${value}^{commit}`]).ok;
}

function main() {
  const head = git(["rev-parse", "HEAD"]);
  const state = readCommittedState();
  const parsed = JSON.parse(state.text);
  const problems = [];

  if (!isReachableCommit(parsed.last_work_commit)) {
    problems.push(`last_work_commit is not reachable: ${parsed.last_work_commit}`);
  }

  if (!isReachableCommit(parsed.last_state_commit)) {
    problems.push(`last_state_commit is not reachable: ${parsed.last_state_commit}`);
  }

  if (parsed.last_state_commit === "self" && state.source !== "HEAD") {
    problems.push("last_state_commit is self, but the state file was not readable from HEAD");
  }

  if (
    parsed.last_state_commit &&
    parsed.last_state_commit !== "self" &&
    parsed.last_state_commit !== "none" &&
    parsed.last_work_commit &&
    parsed.last_state_commit !== parsed.last_work_commit
  ) {
    problems.push(
      "last_state_commit stores a commit sha different from last_work_commit; confirm this was intentional",
    );
  }

  const trackedStatus = git(["status", "--short"]);
  const stateCommit =
    parsed.last_state_commit === "self" ? head : parsed.last_state_commit || "none";

  console.log("Harness state validation:");
  console.log(`- State source: ${state.source}`);
  console.log(`- Originating spec: ${parsed.originating_spec || "null"}`);
  console.log(`- Archived spec: ${parsed.archived_spec || "null"}`);
  console.log(`- Last ticket: ${parsed.last_ticket || "null"}`);
  console.log(`- Last result: ${parsed.last_result || "null"}`);
  console.log(`- Work commit: ${parsed.last_work_commit || "null"}`);
  console.log(`- State commit: ${stateCommit}`);
  console.log(`- Next target: ${parsed.next_target || "null"}`);
  console.log(`- Queue: ${(parsed.queue || []).join(", ") || "empty"}`);
  console.log(`- Proof state: ${parsed.proof_state || "clean"}`);
  console.log(`- Dirty state: ${parsed.dirty_state || "null"}`);
  console.log(`- Tracked status: ${trackedStatus || "clean"}`);

  if (problems.length > 0) {
    console.log("- Validation: FAIL");
    for (const problem of problems) {
      console.log(`  - ${problem}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("- Validation: PASS");
}

main();
