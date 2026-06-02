import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
);

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("SPEC-113 PromptComposeResult web type mirrors backend resolution shape", () => {
  const types = readRepoFile(
    "tools/manual-story-studio/web/src/types/manual-story.ts",
  );

  assert.match(types, /export type PromptIncludedReason =[\s\S]*"current_cast";/);
  assert.match(types, /export type PromptExcludedReason = "inactive" \| "working_set_excluded";/);
  assert.match(types, /export interface PromptIncludedRecord \{[\s\S]*section: string \| null;/);
  assert.match(types, /export interface PromptResolution \{[\s\S]*included: PromptIncludedRecord\[\];[\s\S]*excluded: PromptExcludedRecord\[\];[\s\S]*suppressed: PromptSuppressedRecord\[\];[\s\S]*blocked: PromptBlockedInput\[\];[\s\S]*section_map: Record<string, string\[\]>;/);
  assert.match(types, /export interface PromptComposeResult \{[\s\S]*resolution: PromptResolution;/);
});

test("SPEC-113 PromptPreview renders inspector groups with reasons", () => {
  const source = readRepoFile(
    "tools/manual-story-studio/web/src/pages/PromptPreview.tsx",
  );

  assert.match(source, /import \{ RecordCard \}/);
  assert.match(source, /Prompt Inspector/);
  for (const label of [
    "copy status",
    "hard lint findings",
    "selected cast",
    "selected template",
    "working set",
    "included records",
    "excluded records",
    "suppressed reveals",
    "sections generated",
    "blocked inputs",
  ]) {
    assert.match(source, new RegExp(`aria-label="${label}"`));
  }
  assert.match(source, /Reason: \{reasonLabel\(record\.reason\)\}/);
  assert.match(source, /record\.section \? `; section: \$\{record\.section\}`/);
  assert.match(source, /composeResult\.resolution\.section_map/);
  assert.match(source, /lint\.blockingForCopy \? "Blocked by hard lint" : "Allowed"/);
});
