import assert from "node:assert/strict";
import test from "node:test";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  runCompiledHook,
  seedHookFixtureWorld
} from "./_shared";

test("hook1 injects world context, named entities, relevant nodes, and size warnings", () => {
  const root = createTempRepoRoot();
  seedHookFixtureWorld(root);

  try {
    const result = runCompiledHook(
      "hook1-user-prompt-context.js",
      {
        hook_event_name: "UserPromptSubmit",
        cwd: root,
        prompt: "Please review worlds/animalia/CANON_LEDGER.md and M-1 for Brinewick."
      },
      {
        cwd: root,
        projectDir: root
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"hookEventName":"UserPromptSubmit"/);
    assert.match(result.stdout, /world=animalia/);
    assert.match(result.stdout, /Named entities detected: Brinewick\./);
    assert.match(result.stdout, /Top relevant nodes: .*CF-0001/);
    assert.match(result.stdout, /Top relevant nodes: .*M-1/);
    assert.match(result.stdout, /CANON_LEDGER\.md is always protected/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook1 degrades silently when no world is detected", () => {
  const root = createTempRepoRoot();
  seedHookFixtureWorld(root);

  try {
    const result = runCompiledHook(
      "hook1-user-prompt-context.js",
      {
        hook_event_name: "UserPromptSubmit",
        cwd: root,
        prompt: "Summarize the current implementation plan."
      },
      {
        cwd: root,
        projectDir: root
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});
