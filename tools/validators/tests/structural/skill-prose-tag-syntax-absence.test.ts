import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const packageRoot = process.cwd();
const repoRoot = path.resolve(packageRoot, "../..");
const skillsRoot = path.join(repoRoot, ".claude/skills");

const deprecatedTagSubstrings = [
  ["intro", ":<CLASS>"].join(""),
  ["intro", ":CLK("].join(""),
  ["intro", ":STSEC("].join(""),
  ["intro", ":STQ("].join(""),
  ["intro", ":THR("].join(""),
  ["intro", ":STENT("].join(""),
  ["intro", ":SREL("].join(""),
  ["intro", ":STPLAN("].join(""),
  ["intro", ":STEMO("].join(""),
  ["plan", "_relation:"].join(""),
  ["non", "_propagation:"].join("")
];

test("no skill prose markdown contains deprecated tag syntax", () => {
  assert.deepEqual(findDeprecatedSkillTagSyntax(), []);
});

function findDeprecatedSkillTagSyntax(): string[] {
  const matches: string[] = [];

  for (const filePath of walkMarkdownFiles(skillsRoot)) {
    const relPath = toRepoRelative(filePath);
    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const pattern of deprecatedTagSubstrings) {
        if (line.includes(pattern)) {
          matches.push(`${relPath}:${index + 1}: ${pattern}`);
        }
      }
    });
  }

  return matches;
}

function* walkMarkdownFiles(directory: string): Generator<string> {
  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      yield* walkMarkdownFiles(absolutePath);
    } else if (stat.isFile() && path.extname(entry) === ".md") {
      yield absolutePath;
    }
  }
}

function toRepoRelative(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
