import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { pagePlanVerbatimSectionIntegrity } from "../../src/structural/page-plan-verbatim-section-integrity.js";
import { context } from "./helpers.js";

const STORY = "test-story";
const PLAN_PATH = `stories/${STORY}/pages-prose-plans/PG-1.md`;

const CANONICAL = {
  "2": ["Policy line one.", "Policy line two."].join("\n"),
  "3": ["Craft line one.", "Craft line two.", "Craft line three."].join("\n"),
  "19": ["Instruction line one.", "Instruction line two."].join("\n")
} as const;

test("page_plan_verbatim_section_integrity passes when §2 / §3 / §19 match canonical source byte-for-byte", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan(), repoRoot);

  assert.deepEqual(verdicts, []);
});

test("page_plan_verbatim_section_integrity fails on §3 single-character drift", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan({ section3: CANONICAL["3"].replace("Craft line two.", "Craft line two!") }), repoRoot);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.severity, "fail");
  assert.equal(verdicts[0]?.code, "page_plan_verbatim_section_integrity.drift");
  assert.deepEqual((verdicts[0]?.detail as { section?: string }).section, "3");
});

test("page_plan_verbatim_section_integrity fails on missing §2", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan({ section2: null }), repoRoot);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_plan_verbatim_section_integrity.missing_section");
  assert.deepEqual((verdicts[0]?.detail as { missing_section?: string }).missing_section, "2");
});

test("page_plan_verbatim_section_integrity fails on missing §3", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan({ section3: null }), repoRoot);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_plan_verbatim_section_integrity.missing_section");
  assert.deepEqual((verdicts[0]?.detail as { missing_section?: string }).missing_section, "3");
});

test("page_plan_verbatim_section_integrity fails on missing §19", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan({ section19: null }), repoRoot);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "page_plan_verbatim_section_integrity.missing_section");
  assert.deepEqual((verdicts[0]?.detail as { missing_section?: string }).missing_section, "19");
});

test("page_plan_verbatim_section_integrity strips canonical-source framing header before comparison", async () => {
  const repoRoot = await canonicalRepo({
    "2": ["# Custom framing", "", "Human-only setup.", "", "---", CANONICAL["2"], "", ""].join("\n")
  });
  const verdicts = await run(plan(), repoRoot);

  assert.deepEqual(verdicts, []);
});

test("page_plan_verbatim_section_integrity emits first_diverging_line on drift", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan({ section3: CANONICAL["3"].replace("Craft line two.", "Different line.") }), repoRoot);

  assert.equal(verdicts.length, 1);
  assert.deepEqual((verdicts[0]?.detail as { first_diverging_line?: number }).first_diverging_line, 2);
});

async function run(content: string, repoRoot: string) {
  return pagePlanVerbatimSectionIntegrity.run(
    { files: [{ path: PLAN_PATH, content }], repo_root: repoRoot },
    context([])
  );
}

async function canonicalRepo(overrides: Partial<Record<keyof typeof CANONICAL, string>> = {}): Promise<string> {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "worldloom-verbatim-section-"));
  const contractRoot = path.join(repoRoot, "docs", "prose-renderer-contract");
  await mkdir(contractRoot, { recursive: true });
  await Promise.all([
    writeCanonical(contractRoot, "content-policy.md", overrides["2"] ?? framed("Content Policy", CANONICAL["2"])),
    writeCanonical(contractRoot, "prose-craft-contract.md", overrides["3"] ?? framed("Prose Craft Contract", CANONICAL["3"])),
    writeCanonical(contractRoot, "render-time-instruction.md", overrides["19"] ?? framed("Render-Time Instruction", CANONICAL["19"]))
  ]);
  return repoRoot;
}

async function writeCanonical(root: string, fileName: string, content: string): Promise<void> {
  await writeFile(path.join(root, fileName), content, "utf8");
}

function framed(title: string, content: string): string {
  return [`# ${title}`, "", "Human-only framing.", "", "---", content, ""].join("\n");
}

function plan(overrides: { section2?: string | null; section3?: string | null; section19?: string | null } = {}): string {
  const sections: string[] = [];
  if (overrides.section2 !== null) {
    sections.push("## 2. Content Policy", overrides.section2 ?? CANONICAL["2"]);
  }
  if (overrides.section3 !== null) {
    sections.push("## 3. Prose Craft Contract", overrides.section3 ?? CANONICAL["3"]);
  }
  sections.push("## 4. Story kernel context", "", "Renderer-facing context.");
  if (overrides.section19 !== null) {
    sections.push("## 19. Render-Time Instruction Block", overrides.section19 ?? CANONICAL["19"]);
  }
  return sections.join("\n\n");
}
