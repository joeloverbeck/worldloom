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

test("SPEC-114 records delete UX blocks with referrer cards before repair force-delete", () => {
  const api = readRepoFile("tools/manual-story-studio/web/src/api/records.ts");
  const page = readRepoFile("tools/manual-story-studio/web/src/pages/Records.tsx");

  assert.doesNotMatch(api, /inactive_default|retiredReason/);
  assert.match(api, /outcome:\s*"blocked"/);
  assert.match(api, /summary:\s*ManualRecordSummary/);
  assert.match(api, /url\.searchParams\.set\("mode", opts\.mode \?\? "repair"\)/);

  assert.doesNotMatch(page, /inactive_default|active:false|Record was archived/);
  assert.match(page, /deleteOutcome\.outcome === "blocked"/);
  assert.match(page, /Resolve these references first\./);
  assert.match(page, /deleteOutcome\.referrers\.map/);
  assert.match(page, /<RecordCard[\s\S]*recordClass=\{referrer\.recordClass\}/);

  const forceIndex = page.indexOf("Force delete anyway");
  const detailsIndex = page.lastIndexOf("<details", forceIndex);
  const blockedIndex = page.lastIndexOf('deleteOutcome.outcome === "blocked"', forceIndex);
  assert.notEqual(forceIndex, -1, "missing force-delete repair action");
  assert.notEqual(detailsIndex, -1, "force-delete action must be inside details");
  assert.ok(
    blockedIndex !== -1 && detailsIndex > blockedIndex,
    "force-delete action must live inside the blocked repair disclosure",
  );
});
