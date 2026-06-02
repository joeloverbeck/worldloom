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

test("SPEC-114 beat-template delete UX mirrors records block and repair flow", () => {
  const api = readRepoFile(
    "tools/manual-story-studio/web/src/api/beat-templates.ts",
  );
  const page = readRepoFile(
    "tools/manual-story-studio/web/src/pages/BeatTemplates.tsx",
  );
  const route = readRepoFile(
    "tools/manual-story-studio/src/server/routes/beat-templates.ts",
  );

  assert.doesNotMatch(api, /inactive_default|archived\?:|deleted\?:/);
  assert.match(api, /outcome:\s*"blocked"/);
  assert.match(api, /summary:\s*ManualRecordSummary/);
  assert.match(api, /url\.searchParams\.set\("mode", opts\.mode \?\? "repair"\)/);

  assert.doesNotMatch(page, /inactive_default|Template archived/);
  assert.match(page, /deleteOutcome\.outcome === "blocked"/);
  assert.match(page, /Resolve these references first\./);
  assert.match(page, /<RecordCard[\s\S]*recordClass=\{referrer\.recordClass\}/);
  assert.match(page, /navigate\([\s\S]*\/records\?class=/);

  const forceIndex = page.indexOf("Force delete anyway");
  const detailsIndex = page.lastIndexOf("<details", forceIndex);
  const blockedIndex = page.lastIndexOf('deleteOutcome.outcome === "blocked"', forceIndex);
  assert.notEqual(forceIndex, -1, "missing force-delete repair action");
  assert.notEqual(detailsIndex, -1, "force-delete action must be inside details");
  assert.ok(
    blockedIndex !== -1 && detailsIndex > blockedIndex,
    "force-delete action must live inside the blocked repair disclosure",
  );

  const deleteHandler = route.slice(
    route.indexOf('"/api/worlds/:slug/manual-stories/:msSlug/beat-templates/:id"'),
  );
  assert.doesNotMatch(deleteHandler, /confirm|bodyConfirm/);
  assert.match(deleteHandler, /repair-mode-required/);
});
