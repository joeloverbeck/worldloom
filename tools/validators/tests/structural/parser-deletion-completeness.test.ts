import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const packageRoot = process.cwd();
const repoRoot = path.resolve(packageRoot, "../..");

const searchRoots = ["tools", ".claude/skills", "docs"];
const includedExtensions = new Set([".ts", ".js", ".md"]);
const skippedDirectoryNames = new Set(["dist", "node_modules", ".git"]);
const skippedRelativeDirectories = new Set(["docs/plans"]);
const deprecatedPatterns = [
  ["intro", "-tag-parser"].join(""),
  ["extract", "IntroTags"].join(""),
  ["parse", "PlanRelationTags"].join(""),
  ["parse", "IntroTag"].join("")
];

test("no current source, skill, or docs surface references the deleted intro tag parser", () => {
  assert.deepEqual(findDeprecatedParserReferences(), []);
});

function findDeprecatedParserReferences(): string[] {
  const matches: string[] = [];

  for (const root of searchRoots) {
    const absoluteRoot = path.join(repoRoot, root);
    for (const filePath of walkFiles(absoluteRoot)) {
      const relPath = toRepoRelative(filePath);
      const content = readFileSync(filePath, "utf8");
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const pattern of deprecatedPatterns) {
          if (line.includes(pattern)) {
            matches.push(`${relPath}:${index + 1}: ${pattern}`);
          }
        }
      });
    }
  }

  return matches;
}

function* walkFiles(directory: string): Generator<string> {
  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const relPath = toRepoRelative(absolutePath);

    if (skippedDirectoryNames.has(entry) || skippedRelativeDirectories.has(relPath)) {
      continue;
    }

    const stat = statSync(absolutePath);
    if (stat.isDirectory()) {
      yield* walkFiles(absolutePath);
    } else if (stat.isFile() && includedExtensions.has(path.extname(entry))) {
      yield absolutePath;
    }
  }
}

function toRepoRelative(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
