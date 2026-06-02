import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import type { CurrentContext } from "../../src/schema/current-context.js";
import { writeCurrentContext } from "../../src/write/current-context.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

function mkWorld(): { repoRoot: string; manualStoryRoot: ManualStoryRoot } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-current-context-"));
  mkdirSync(
    path.join(repoRoot, "worlds", "test-world", "manual-stories", "test-story"),
    { recursive: true },
  );
  return {
    repoRoot,
    manualStoryRoot: resolveManualStoryRoot(
      repoRoot,
      "test-world",
      "test-story",
    ),
  };
}

function context(overrides: Partial<CurrentContext> = {}): CurrentContext {
  return {
    current_location: "mloc-2",
    current_cast: ["mchar-1", "mchar-3"],
    pov_holder: "mchar-1",
    active_pressure_clocks: ["mclock-1"],
    active_secrets_questions: ["msecret-2", "mq-1"],
    pinned_records: ["mrel-4", "mobl-1"],
    must_not_reveal: ["msecret-2"],
    current_handoff_summary: "Mara waits in the riverhouse kitchen.",
    last_accepted_segment: "SEG-7",
    last_reviewed_after_segment: "SEG-7",
    ...overrides,
  };
}

test("writeCurrentContext: writes current-context.yaml round trip", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const ctx = context();

    writeCurrentContext(manualStoryRoot, ctx);

    const fullPath = path.join(manualStoryRoot.absolutePath, "current-context.yaml");
    assert.equal(existsSync(fullPath), true);
    const parsed = YAML.parse(readFileSync(fullPath, "utf8")) as CurrentContext;
    assert.deepEqual(parsed, ctx);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("writeCurrentContext: rejects sandbox escapes through ManualStoryRoot", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const outsideRoot = path.join(repoRoot, "worlds", "test-world", "characters");
    mkdirSync(outsideRoot, { recursive: true });
    const doctoredRoot: ManualStoryRoot = {
      ...manualStoryRoot,
      absolutePath: outsideRoot,
    };

    assert.throws(
      () => writeCurrentContext(doctoredRoot, context()),
      /sandbox denylist hit/,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("writeCurrentContext: full-file replace truncates prior content", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const fullPath = path.join(manualStoryRoot.absolutePath, "current-context.yaml");
    writeFileSync(fullPath, "stale_field: should disappear\n");
    const replacement = context({
      current_location: null,
      current_cast: [],
      pov_holder: null,
      active_pressure_clocks: [],
      active_secrets_questions: [],
      pinned_records: [],
      must_not_reveal: [],
      current_handoff_summary: "",
      last_accepted_segment: null,
      last_reviewed_after_segment: null,
    });

    writeCurrentContext(manualStoryRoot, replacement);

    const text = readFileSync(fullPath, "utf8");
    assert.equal(text, YAML.stringify(replacement));
    assert.doesNotMatch(text, /stale_field/);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
