import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
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

function repoPath(relativePath: string): string {
  return path.join(REPO_ROOT, relativePath);
}

function readRepoFile(relativePath: string): string {
  return readFileSync(repoPath(relativePath), "utf8");
}

function walkSourceFiles(relativePath: string): string[] {
  const absolute = repoPath(relativePath);
  const out: string[] = [];
  for (const entry of readdirSync(absolute)) {
    const childRelative = path.join(relativePath, entry);
    const childAbsolute = repoPath(childRelative);
    const stats = statSync(childAbsolute);
    if (stats.isDirectory()) {
      out.push(...walkSourceFiles(childRelative));
    } else if (/\.[cm]?[tj]sx?$/.test(entry)) {
      out.push(childRelative);
    }
  }
  return out;
}

function pickerSnippetBetween(source: string, label: string, end: string): string {
  const labelIndex = source.indexOf(label);
  assert.notEqual(labelIndex, -1, `missing picker label: ${label}`);
  const startIndex = source.lastIndexOf("<RecordPicker", labelIndex);
  assert.notEqual(startIndex, -1, `missing RecordPicker before label: ${label}`);
  const endIndex = source.indexOf(end, labelIndex + label.length);
  assert.notEqual(endIndex, -1, `missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("SPEC-112 RecordPicker component and mount surfaces exist", () => {
  assert.match(
    readRepoFile("tools/manual-story-studio/web/src/components/RecordPicker.tsx"),
    /export function RecordPicker/,
  );

  const editPromptWorkingSet = readRepoFile(
    "tools/manual-story-studio/web/src/pages/EditPromptWorkingSet.tsx",
  );
  assert.match(editPromptWorkingSet, /import \{ RecordPicker \}/);
  assert.match(editPromptWorkingSet, /label="Current location"/);
  assert.match(editPromptWorkingSet, /label="POV holder"/);
  assert.match(editPromptWorkingSet, /label="Must not reveal"[\s\S]*classes=\{\["secrets"\]\}/);
  assert.doesNotMatch(editPromptWorkingSet, /IdTextArea/);

  const currentStatePanel = readRepoFile(
    "tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx",
  );
  assert.match(currentStatePanel, /listRecordsForClasses/);
  assert.match(currentStatePanel, /displayTitle\(ctx\.current_location/);
  assert.match(currentStatePanel, /chipList\(ctx\.current_cast,\s*titleById\)/);

  const momentComposer = readRepoFile(
    "tools/manual-story-studio/web/src/pages/MomentComposer.tsx",
  );
  assert.match(momentComposer, /import \{ RecordPicker \}/);
  assert.match(momentComposer, /label="Involved cast"/);
  assert.match(momentComposer, /label="Relevant records"/);
  assert.doesNotMatch(momentComposer, /toggleCast|\+ Pin|Unpin|type="checkbox"/);
  assert.match(momentComposer, /included_cast: includedCast/);
  assert.match(momentComposer, /included_records: pinnedRecordIds/);
});

test("SPEC-112 RecordForm refs use RecordPicker while ChipInput remains for non-reference arrays", () => {
  const recordForm = readRepoFile(
    "tools/manual-story-studio/web/src/components/RecordForm.tsx",
  );

  assert.match(recordForm, /function ChipInput/);
  assert.match(recordForm, /ariaLabel="tags"/);
  assert.match(recordForm, /case "stringArray"[\s\S]*<ChipInput/);

  for (const [start, end] of [
    ['label="Refs (characters)"', 'label="Refs (locations)"'],
    ['label="Refs (locations)"', 'label="Refs (related records)"'],
    ['label="Refs (related records)"', 'label="Prompt visibility"'],
  ] as const) {
    const refsSection = pickerSnippetBetween(recordForm, start, end);
    assert.match(refsSection, /<RecordPicker/);
    assert.doesNotMatch(refsSection, /<ChipInput/);
  }
});

test("SPEC-112 AC#1: IdTextArea is absent from web source", () => {
  for (const relativePath of walkSourceFiles("tools/manual-story-studio/web/src")) {
    assert.doesNotMatch(
      readRepoFile(relativePath),
      /IdTextArea/,
      `${relativePath} must not contain IdTextArea`,
    );
  }
});
