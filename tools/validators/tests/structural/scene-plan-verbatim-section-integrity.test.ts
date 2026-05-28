import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { scenePlanVerbatimSectionIntegrity } from "../../src/structural/scene-plan-verbatim-section-integrity.js";
import { context } from "./helpers.js";

const STORY = "red-bunny";
const PLAN_PATH = `stories/${STORY}/scene-prose-plans/SCN-1.md`;
const CANONICAL = {
  "2": ["Policy line one.", "Policy line two."].join("\n"),
  "3": ["Craft line one.", "Craft line two."].join("\n"),
  "19": ["Instruction line one.", "Instruction line two."].join("\n")
} as const;

test("scene_plan_verbatim_section_integrity passes byte-equal verbatim sections", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan(), repoRoot);

  assert.deepEqual(verdicts, []);
});

test("scene_plan_verbatim_section_integrity fails on canonical drift", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan({ section3: "Craft line one.\nDifferent line." }), repoRoot);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "scene_plan_verbatim_section_integrity.drift");
  assert.deepEqual((verdicts[0]?.detail as { section?: string }).section, "3");
});

test("scene_plan_verbatim_section_integrity fails on missing render-time section", async () => {
  const repoRoot = await canonicalRepo();
  const verdicts = await run(plan({ section19: null }), repoRoot);

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "scene_plan_verbatim_section_integrity.missing_section");
  assert.deepEqual((verdicts[0]?.detail as { missing_section?: string }).missing_section, "19");
});

async function run(content: string, repoRoot: string) {
  return scenePlanVerbatimSectionIntegrity.run(
    { files: [{ path: PLAN_PATH, content }], repo_root: repoRoot },
    context([])
  );
}

async function canonicalRepo(): Promise<string> {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "worldloom-scene-verbatim-"));
  const contractRoot = path.join(repoRoot, "docs", "prose-renderer-contract");
  await mkdir(contractRoot, { recursive: true });
  await Promise.all([
    writeCanonical(contractRoot, "content-policy.md", framed("Content Policy", CANONICAL["2"])),
    writeCanonical(contractRoot, "prose-craft-contract.md", framed("Prose Craft Contract", CANONICAL["3"])),
    writeCanonical(contractRoot, "render-time-instruction.md", framed("Render-Time Instruction", CANONICAL["19"]))
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
  const sections = ["# Scene: Bench Talk"];
  if (overrides.section2 !== null) {
    sections.push("## 2. Content Policy", overrides.section2 ?? CANONICAL["2"]);
  }
  if (overrides.section3 !== null) {
    sections.push("## 3. Prose Craft Contract", overrides.section3 ?? CANONICAL["3"]);
  }
  sections.push("## 4. Render Mission", "Open on the bench and stop at the final choice.");
  if (overrides.section19 !== null) {
    sections.push("## 14. Render-Time Instruction", overrides.section19 ?? CANONICAL["19"]);
  }
  return sections.join("\n\n");
}
