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

function snippetBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
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
  const recordSchemas = readRepoFile(
    "tools/manual-story-studio/web/src/components/recordSchemas.ts",
  );

  assert.match(recordForm, /function ChipInput/);
  assert.match(recordForm, /ariaLabel="tags"/);
  assert.match(recordForm, /case "stringArray"[\s\S]*<ChipInput/);
  assert.match(recordForm, /case "recordRefArray"[\s\S]*<RecordPicker/);
  assert.match(recordForm, /label=\{label\}/);
  assert.match(recordForm, /classes=\{kind\.classes\}/);
  const heldBySchema = snippetBetween(
    recordSchemas,
    'field: "held_by"',
    'field: "audience_visibility"',
  );
  assert.match(heldBySchema, /label: "Held by"/);
  assert.match(heldBySchema, /kind: \{ kind: "recordRefArray", classes: \["cast"\] \}/);
  assert.doesNotMatch(heldBySchema, /kind: \{ kind: "stringArray" \}/);

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

test("MSSUX-008 RecordPicker dismisses its popup on outside mousedown only", () => {
  const source = readRepoFile(
    "tools/manual-story-studio/web/src/components/RecordPicker.tsx",
  );

  assert.match(source, /const containerRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(source, /<div className="record-picker" ref=\{containerRef\}>/);
  assert.match(source, /document\.addEventListener\("mousedown", handleDocumentMouseDown\);/);
  assert.match(
    source,
    /document\.removeEventListener\("mousedown", handleDocumentMouseDown\);/,
  );
  assert.match(source, /container\.contains\(event\.target\)/);
  assert.match(source, /setOpen\(false\);/);

  const dismissalEffectIndex = source.indexOf("function handleDocumentMouseDown");
  const popupIndex = source.indexOf('className="record-picker__popup"');
  assert.notEqual(dismissalEffectIndex, -1, "missing document dismissal handler");
  assert.notEqual(popupIndex, -1, "missing popup render surface");
  assert.ok(
    dismissalEffectIndex < popupIndex,
    "dismissal handler should be defined before the popup render surface",
  );
});

test("MSSUX-008 RecordPicker preserves option selection inside the popup", () => {
  const source = readRepoFile(
    "tools/manual-story-studio/web/src/components/RecordPicker.tsx",
  );
  const optionSection = source.slice(
    source.indexOf('className="record-picker__option"'),
    source.indexOf("</div>", source.indexOf('className="record-picker__option"')),
  );

  assert.match(optionSection, /<RecordCard/);
  assert.match(optionSection, /interactionRole="option"/);
  assert.match(optionSection, /onSelect=\{commitSelection\}/);
  assert.match(
    source,
    /if \(event\.target instanceof Node && container\.contains\(event\.target\)\) return;/,
  );
});

test("MSSUX-014 MomentComposer seeds relevant records from the full active working set", () => {
  const source = readRepoFile(
    "tools/manual-story-studio/web/src/pages/MomentComposer.tsx",
  );
  const helperStart = source.indexOf("function activeWorkingSetRecordIds");
  assert.notEqual(helperStart, -1, "missing active working-set record helper");
  const helperEnd = source.indexOf("interface ComposerNavState", helperStart);
  assert.notEqual(helperEnd, -1, "missing helper end marker");
  const helper = source.slice(helperStart, helperEnd);

  assert.match(helper, /promptWorkingSet\?\.current_location/);
  assert.match(helper, /promptWorkingSet\?\.active_pressure_clocks/);
  assert.match(helper, /promptWorkingSet\?\.active_secrets_questions/);
  assert.match(helper, /promptWorkingSet\?\.pinned_records/);
  assert.match(helper, /return \[\.\.\.new Set\(seeded\)\];/);
  assert.doesNotMatch(helper, /must_not_reveal/);

  const navOverrideIndex = source.indexOf("if (!navState.included_records)");
  assert.notEqual(navOverrideIndex, -1, "missing included_records nav override guard");
  const seedCallIndex = source.indexOf(
    "activeWorkingSetRecordIds(promptWorkingSet)",
    navOverrideIndex,
  );
  assert.notEqual(seedCallIndex, -1, "missing active working-set seed call");
  const setPinnedIndex = source.indexOf("setPinnedRecordIds(activeRecordIds)", seedCallIndex);
  assert.notEqual(setPinnedIndex, -1, "missing active working-set state update");
});
