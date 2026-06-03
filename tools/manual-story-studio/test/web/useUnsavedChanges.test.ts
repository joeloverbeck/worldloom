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

const REQUIRED_APPLICATIONS = [
  "tools/manual-story-studio/web/src/pages/MomentComposer.tsx",
  "tools/manual-story-studio/web/src/pages/EditContract.tsx",
  "tools/manual-story-studio/web/src/components/RecordForm.tsx",
  "tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx",
  "tools/manual-story-studio/web/src/pages/EditPromptWorkingSet.tsx",
];

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("SPEC-111 unsaved-change hook is applied to editor forms only", () => {
  for (const relativePath of REQUIRED_APPLICATIONS) {
    const source = readRepoFile(relativePath);
    assert.match(
      source,
      /useUnsavedChanges/,
      `${relativePath} must import and call useUnsavedChanges`,
    );
  }

  const dashboard = readRepoFile(
    "tools/manual-story-studio/web/src/pages/Dashboard.tsx",
  );
  assert.doesNotMatch(
    dashboard,
    /useUnsavedChanges/,
    "Dashboard directive draft is scratch state and must not use the hook",
  );
});

test("SPEC-111 App uses a data router so useBlocker can run", () => {
  const source = readRepoFile("tools/manual-story-studio/web/src/App.tsx");
  assert.match(source, /createBrowserRouter/);
  assert.match(source, /RouterProvider/);
  assert.doesNotMatch(source, /import\s+\{\s*BrowserRouter/);
  assert.doesNotMatch(source, /<BrowserRouter\b/);
});
