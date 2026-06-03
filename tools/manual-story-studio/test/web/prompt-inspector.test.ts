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
  assert.match(types, /export type PromptExcludedReason =[\s\S]*"never_prompt";/);
  assert.match(types, /export interface PromptIncludedRecord \{[\s\S]*summary: string;[\s\S]*importance: RecordImportance;[\s\S]*prompt_visibility: PromptVisibility;[\s\S]*involved_cast: string\[\];[\s\S]*tags: string\[\];[\s\S]*section: string \| null;/);
  assert.match(types, /export interface PromptSuppressedRecord \{[\s\S]*class: ManualRecordClass;[\s\S]*summary: string;/);
  assert.match(types, /export interface PromptResolution \{[\s\S]*included: PromptIncludedRecord\[\];[\s\S]*excluded: PromptExcludedRecord\[\];[\s\S]*suppressed: PromptSuppressedRecord\[\];[\s\S]*blocked: PromptBlockedInput\[\];[\s\S]*section_map: Record<string, string\[\]>;/);
  assert.match(types, /export interface PromptComposeResult \{[\s\S]*resolution: PromptResolution;/);
});

test("SPEC-119 PromptPreview renders confidence panels with identity and reasons", () => {
  const source = readRepoFile(
    "tools/manual-story-studio/web/src/pages/PromptPreview.tsx",
  );

  assert.match(source, /import \{ RecordCard \}/);
  assert.match(source, /Prompt Confidence/);
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
  assert.match(source, /summary: record\.summary/);
  assert.doesNotMatch(source, /summary: `Reason:/);
  assert.match(source, /reason=\{reason\}/);
  assert.match(source, /These records will shape the prompt/);
  assert.match(source, /These were deliberately excluded/);
  assert.match(source, /These secrets are protected/);
  assert.match(source, /This is safe to copy/);
  assert.match(source, /renderLedgerIdList\(composeResult\.sidecar_draft\.included_cast/);
  assert.match(source, /renderLedgerIdList\(composeResult\.sidecar_draft\.included_records/);
  assert.doesNotMatch(source, /sidecar_draft\.included_cast\.join/);
  assert.doesNotMatch(source, /sidecar_draft\.included_records\.join/);
  assert.match(source, /composeResult\.resolution\.section_map/);
  assert.match(source, /<details>/);
  assert.match(source, /<summary>Show section map<\/summary>/);
  assert.doesNotMatch(source, /ids\.join/);
  assert.match(source, /lint\.blockingForCopy \? "Blocked by hard lint" : "Allowed"/);
});

test("SPEC-119 RecordCard reason prop is additive", () => {
  const source = readRepoFile(
    "tools/manual-story-studio/web/src/components/RecordCard.tsx",
  );

  assert.match(source, /reason\?: string;/);
  assert.match(source, /<span style=\{\{ fontWeight: 600 \}\}>Reason<\/span>: \{reason\}/);
});
