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

import type { PromptWorkingSet } from "../../src/schema/prompt-working-set.js";
import { writePromptWorkingSet } from "../../src/write/prompt-working-set.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

const LEGACY_REVIEW_KEY = ["last", "reviewed", "after", "segment"].join("_");

function mkWorld(): { repoRoot: string; manualStoryRoot: ManualStoryRoot } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-prompt-working-set-"));
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

function context(overrides: Partial<PromptWorkingSet> = {}): PromptWorkingSet {
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
    ...overrides,
  };
}

test("writePromptWorkingSet: writes prompt-working-set.yaml round trip", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const ctx = context();

    writePromptWorkingSet(manualStoryRoot, ctx);

    const fullPath = path.join(manualStoryRoot.absolutePath, "prompt-working-set.yaml");
    assert.equal(existsSync(fullPath), true);
    const parsed = YAML.parse(readFileSync(fullPath, "utf8")) as PromptWorkingSet;
    assert.deepEqual(parsed, ctx);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("writePromptWorkingSet: rejects sandbox escapes through ManualStoryRoot", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const outsideRoot = path.join(repoRoot, "worlds", "test-world", "characters");
    mkdirSync(outsideRoot, { recursive: true });
    const doctoredRoot: ManualStoryRoot = {
      ...manualStoryRoot,
      absolutePath: outsideRoot,
    };

    assert.throws(
      () => writePromptWorkingSet(doctoredRoot, context()),
      /sandbox denylist hit/,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("writePromptWorkingSet: full-file replace truncates prior content", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const fullPath = path.join(manualStoryRoot.absolutePath, "prompt-working-set.yaml");
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
    });

    writePromptWorkingSet(manualStoryRoot, replacement);

    const text = readFileSync(fullPath, "utf8");
    assert.equal(text, YAML.stringify(replacement));
    assert.doesNotMatch(text, /stale_field/);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("writePromptWorkingSet: strips legacy reviewed segment marker", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const ctx = {
      ...context(),
      [LEGACY_REVIEW_KEY]: "SEG-7",
    } as PromptWorkingSet;

    writePromptWorkingSet(manualStoryRoot, ctx);

    const fullPath = path.join(manualStoryRoot.absolutePath, "prompt-working-set.yaml");
    const parsed = YAML.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
    assert.equal(Object.hasOwn(parsed, LEGACY_REVIEW_KEY), false);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
