import assert from "node:assert/strict";
import test from "node:test";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  runCompiledHook
} from "./_shared";

test("hook4 injects localization bootstrap context for subagents", () => {
  const root = createTempRepoRoot();

  try {
    const result = runCompiledHook(
      "hook4-subagent-localization.js",
      {
        hook_event_name: "SubagentStart",
        cwd: root,
        agent_id: "agent-123",
        agent_type: "Explore"
      },
      {
        cwd: root,
        projectDir: root
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"hookEventName":"SubagentStart"/);
    assert.match(result.stdout, /Search exact ids first/);
    assert.match(result.stdout, /mcp__worldloom__search_nodes/);
  } finally {
    destroyTempRepoRoot(root);
  }
});
