import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

/*
The "write-in CHC" pattern is intentionally prohibited.

Background
----------
Earlier prose in `branching-story-bootstrap` and `branching-story-turn-cycle`
instructed authors to always emit an extra placeholder CHC representing a
player write-in slot (a "do/say something specific — player supplies the
action" choice). Empirically this produced non-actionable placeholder records
(e.g. red-bunny CHC-4 at PG-1 and CHC-8 at PG-2) that grounded only in generic
state and were structurally unselectable in practice.

Why it was removed
------------------
`branching-story-turn-cycle` already exposes player write-in as a first-class
skill input: `manual_action_text` paired with
`action_source_mode: resolve_write_in`, parsed against `STORY_KERNEL.md`'s
`## Player Agency Contract` in Phase 1. That input path is XOR with
`chosen_choice_id`, so a write-in invocation bypasses the CHC pool entirely —
there is nothing the placeholder CHC adds to the agency surface.
`branching-story-bootstrap` takes no manual-action input at all, so its
placeholder is redundant by construction. Keeping the instruction polluted the
CHC pool with records that violate the spirit of FOUNDATIONS Rule 1 (every
record must be load-bearing in active state).

What this test enforces
-----------------------
Skill prose under `.claude/skills/` must NOT instruct authors to emit a
write-in CHC. The forbidden phrases below are the verbatim directive shapes
that were removed. If you are about to reintroduce one of them, the design
decision above is what you would be reversing — surface it as a brainstorm
first.

Note: the forbidden strings are split via `.join("")` so this test file does
not match its own scan.
*/

const packageRoot = process.cwd();
const repoRoot = path.resolve(packageRoot, "../..");
const skillsRoot = path.join(repoRoot, ".claude/skills");

const forbiddenWriteInDirectives = [
  ["Always allow a ", "write-in slot"].join(""),
  ["Always emit a ", "write-in slot"].join(""),
  ["plus a ", "write-in slot"].join(""),
  ["+ ", "write-in slot"].join(""),
  ["and a ", "write-in slot"].join(""),
  ["include a ", "write-in slot"].join(""),
  ["non-", "write-in CHC"].join(""),
];

test("no skill prose instructs authors to emit a placeholder write-in CHC", () => {
  assert.deepEqual(findForbiddenWriteInDirectives(), []);
});

function findForbiddenWriteInDirectives(): string[] {
  const matches: string[] = [];

  for (const filePath of walkMarkdownFiles(skillsRoot)) {
    const relPath = toRepoRelative(filePath);
    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const pattern of forbiddenWriteInDirectives) {
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
