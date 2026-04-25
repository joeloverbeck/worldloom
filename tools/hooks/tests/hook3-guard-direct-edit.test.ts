import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  runCompiledHook
} from "./_shared";

function buildToolInput(filePath: string): Record<string, unknown> {
  return { file_path: filePath };
}

test("hook3 blocks Edit on _source/*.yaml records", () => {
  const root = createTempRepoRoot();

  try {
    const result = runCompiledHook(
      "hook3-guard-direct-edit.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        tool_name: "Edit",
        tool_input: buildToolInput(
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0001.yaml")
        )
      },
      { cwd: root, projectDir: root }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /patch-engine-only/);
    assert.match(result.stdout, /submit_patch_plan/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook3 blocks Write on _source/*.yaml records under any subdirectory", () => {
  const root = createTempRepoRoot();

  try {
    for (const subdir of [
      "canon",
      "change-log",
      "invariants",
      "mystery-reserve",
      "open-questions",
      "entities",
      "everyday-life",
      "institutions",
      "magic-or-tech-systems",
      "geography",
      "economy-and-resources",
      "peoples-and-species",
      "timeline"
    ]) {
      const result = runCompiledHook(
        "hook3-guard-direct-edit.js",
        {
          hook_event_name: "PreToolUse",
          cwd: root,
          tool_name: "Write",
          tool_input: buildToolInput(
            path.join(root, "worlds", "animalia", "_source", subdir, "REC-0001.yaml")
          )
        },
        { cwd: root, projectDir: root }
      );

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /"permissionDecision":"deny"/, `expected deny for ${subdir}`);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook3 allows direct edits to WORLD_KERNEL.md, ONTOLOGY.md, hybrid artifacts, and _source READMEs", () => {
  const root = createTempRepoRoot();

  try {
    const allowedPaths = [
      path.join(root, "worlds", "animalia", "WORLD_KERNEL.md"),
      path.join(root, "worlds", "animalia", "ONTOLOGY.md"),
      path.join(root, "worlds", "animalia", "_source", "canon", "README.md"),
      path.join(root, "worlds", "animalia", "_source", "invariants", "README.md"),
      path.join(root, "worlds", "animalia", "characters", "vespera-nightwhisper.md"),
      path.join(root, "worlds", "animalia", "diegetic-artifacts", "DA-0001-letter.md"),
      path.join(root, "worlds", "animalia", "adjudications", "PA-0001-accept.md"),
      path.join(root, "worlds", "animalia", "proposals", "PR-0001-foo.md"),
      path.join(root, "worlds", "animalia", "audits", "AU-0001-2026-04-26.md"),
      path.join(root, "worlds", "animalia", "audits", "AU-0001", "retcon-proposals", "RP-0001-fix.md"),
      path.join(root, "worlds", "animalia", "briefs", "draft.md")
    ];

    for (const filePath of allowedPaths) {
      const result = runCompiledHook(
        "hook3-guard-direct-edit.js",
        {
          hook_event_name: "PreToolUse",
          cwd: root,
          tool_name: "Edit",
          tool_input: buildToolInput(filePath)
        },
        { cwd: root, projectDir: root }
      );

      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "", `expected pass-through for ${filePath}`);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook3 ignores tools other than Edit/Write and paths outside worlds/", () => {
  const root = createTempRepoRoot();

  try {
    const otherTool = runCompiledHook(
      "hook3-guard-direct-edit.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        tool_name: "Read",
        tool_input: buildToolInput(
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0001.yaml")
        )
      },
      { cwd: root, projectDir: root }
    );
    assert.equal(otherTool.status, 0, otherTool.stderr);
    assert.equal(otherTool.stdout, "");

    const outsideWorlds = runCompiledHook(
      "hook3-guard-direct-edit.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        tool_name: "Edit",
        tool_input: buildToolInput(path.join(root, "tools", "hooks", "package.json"))
      },
      { cwd: root, projectDir: root }
    );
    assert.equal(outsideWorlds.status, 0, outsideWorlds.stderr);
    assert.equal(outsideWorlds.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook3 has no override token", () => {
  const root = createTempRepoRoot();

  try {
    const result = runCompiledHook(
      "hook3-guard-direct-edit.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        tool_name: "Edit",
        tool_input: buildToolInput(
          path.join(root, "worlds", "animalia", "_source", "canon", "CF-0001.yaml")
        )
      },
      {
        cwd: root,
        projectDir: root
      }
    );

    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.doesNotMatch(result.stdout, /ALLOW_DIRECT_EDIT|ALLOW_FULL_READ/);
  } finally {
    destroyTempRepoRoot(root);
  }
});
