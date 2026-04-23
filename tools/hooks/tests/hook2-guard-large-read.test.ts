import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  createTempRepoRoot,
  destroyTempRepoRoot,
  runCompiledHook,
  seedHookFixtureWorld,
  writeTranscript
} from "./_shared";

test("hook2 blocks full reads of always-protected files", () => {
  const root = createTempRepoRoot();
  seedHookFixtureWorld(root);
  const transcriptPath = writeTranscript(root, "transcript.jsonl", '{"prompt":"Please inspect worlds/animalia/CANON_LEDGER.md"}\n');

  try {
    const result = runCompiledHook(
      "hook2-guard-large-read.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        transcript_path: transcriptPath,
        tool_name: "Read",
        tool_input: {
          file_path: path.join(root, "worlds", "animalia", "CANON_LEDGER.md")
        }
      },
      {
        cwd: root,
        projectDir: root
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"permissionDecision":"deny"/);
    assert.match(result.stdout, /ALLOW_FULL_READ/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook2 blocks threshold-protected full reads but allows scoped reads and allowed directories", () => {
  const root = createTempRepoRoot();
  seedHookFixtureWorld(root);
  const transcriptPath = writeTranscript(root, "transcript.jsonl", '{"prompt":"Please inspect worlds/animalia/INSTITUTIONS.md"}\n');

  try {
    const thresholdBlocked = runCompiledHook(
      "hook2-guard-large-read.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        transcript_path: transcriptPath,
        tool_name: "Read",
        tool_input: {
          file_path: path.join(root, "worlds", "animalia", "INSTITUTIONS.md")
        }
      },
      {
        cwd: root,
        projectDir: root
      }
    );
    assert.match(thresholdBlocked.stdout, /"permissionDecision":"deny"/);

    const scopedAllowed = runCompiledHook(
      "hook2-guard-large-read.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        transcript_path: transcriptPath,
        tool_name: "Read",
        tool_input: {
          file_path: path.join(root, "worlds", "animalia", "INSTITUTIONS.md"),
          offset: 120,
          limit: 40
        }
      },
      {
        cwd: root,
        projectDir: root
      }
    );
    assert.equal(scopedAllowed.stdout, "");

    const directoryAllowed = runCompiledHook(
      "hook2-guard-large-read.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        transcript_path: transcriptPath,
        tool_name: "Read",
        tool_input: {
          file_path: path.join(root, "worlds", "animalia", "characters", "vespera-nightwhisper.md")
        }
      },
      {
        cwd: root,
        projectDir: root
      }
    );
    assert.equal(directoryAllowed.stdout, "");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("hook2 respects ALLOW_FULL_READ override", () => {
  const root = createTempRepoRoot();
  seedHookFixtureWorld(root);
  const transcriptPath = writeTranscript(
    root,
    "transcript.jsonl",
    '{"prompt":"ALLOW_FULL_READ Please inspect worlds/animalia/CANON_LEDGER.md"}\n'
  );

  try {
    const result = runCompiledHook(
      "hook2-guard-large-read.js",
      {
        hook_event_name: "PreToolUse",
        cwd: root,
        transcript_path: transcriptPath,
        tool_name: "Read",
        tool_input: {
          file_path: path.join(root, "worlds", "animalia", "CANON_LEDGER.md")
        }
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
