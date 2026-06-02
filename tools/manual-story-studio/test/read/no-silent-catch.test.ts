import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const WEB_SRC_ROOT = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "web",
  "src",
);

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(fullPath);
    } else if (/\.[cm]?[tj]sx?$/.test(entry.name)) {
      yield fullPath;
    }
  }
}

test("SPEC-111 AC #6: web sources contain no exact silent promise catch", () => {
  const matches: string[] = [];
  for (const filePath of sourceFiles(WEB_SRC_ROOT)) {
    const source = readFileSync(filePath, "utf8");
    if (source.includes(".catch(() => {})")) {
      matches.push(path.relative(WEB_SRC_ROOT, filePath));
    }
  }

  assert.deepEqual(matches, []);
});
