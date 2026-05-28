import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SCENE_PLAN_VERBATIM_CANONICAL_SOURCES,
  stripScenePlanVerbatimFramingHeader
} from "../../src/package-interop.js";
import { runInlineCanonicalProseSectionsCli } from "../../src/cli/inline-canonical-prose-sections.js";

const CANONICAL = {
  "2": ["Policy line one.", "Policy line two."].join("\n"),
  "3": ["Craft line one.", "Craft line two.", "Craft line three."].join("\n"),
  "19": ["Instruction line one.", "Instruction line two."].join("\n")
} as const;

type SectionNumber = keyof typeof CANONICAL;

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-inline-canonical-"));
}

function makeRoot(overrides: Partial<Record<SectionNumber, string | null>> = {}): string {
  const root = makeTmpDir();
  mkdirSync(path.join(root, "docs", "prose-renderer-contract"), { recursive: true });
  mkdirSync(path.join(root, "worlds"), { recursive: true });
  writeFileSync(path.join(root, "docs", "FOUNDATIONS.md"), "# Foundations\n", "utf8");

  for (const section of Object.keys(CANONICAL) as SectionNumber[]) {
    if (overrides[section] === null) {
      continue;
    }
    const relativePath = SCENE_PLAN_VERBATIM_CANONICAL_SOURCES[section];
    writeFileSync(
      path.join(root, relativePath),
      overrides[section] ?? framed(section, CANONICAL[section]),
      "utf8"
    );
  }

  return root;
}

function framed(section: SectionNumber, content: string): string {
  return [`# Canonical §${section}`, "", "Human-only framing.", "", "---", content, ""].join("\n");
}

function plan(overrides: Partial<Record<SectionNumber, string | null>> = {}): string {
  const sections: string[] = [];
  if (overrides["2"] !== null) {
    sections.push("## 2. Content Policy", overrides["2"] ?? CANONICAL["2"]);
  }
  if (overrides["3"] !== null) {
    sections.push("## 3. Prose Craft Contract", overrides["3"] ?? CANONICAL["3"]);
  }
  sections.push("## 4. Story kernel context", "Renderer-facing context.");
  if (overrides["19"] !== null) {
    sections.push("## 19. Render-Time Instruction Block", overrides["19"] ?? CANONICAL["19"]);
  }
  return `${sections.join("\n\n")}\n`;
}

function writeText(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, content, "utf8");
  return filePath;
}

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function extractSection(content: string, section: SectionNumber): string {
  const lines = content.split(/\r?\n/);
  const headings: Array<{ lineIndex: number; number: string }> = [];
  lines.forEach((line, index) => {
    const match = line.match(/^##\s+(\d+)\.\s*(.+?)\s*$/);
    if (match?.[1]) {
      headings.push({ lineIndex: index, number: match[1] });
    }
  });
  const headingIndex = headings.findIndex((heading) => heading.number === section);
  assert.notEqual(headingIndex, -1);
  const heading = headings[headingIndex];
  assert.ok(heading);
  const next = headings[headingIndex + 1]?.lineIndex ?? lines.length;
  const bodyLines = lines.slice(heading.lineIndex + 1, next);
  while ((bodyLines[0] ?? "").trim() === "") {
    bodyLines.shift();
  }
  return bodyLines.join("\n").replace(/[ \t\r\n]+$/, "");
}

function canonicalBody(root: string, section: SectionNumber): string {
  return stripScenePlanVerbatimFramingHeader(
    read(path.join(root, SCENE_PLAN_VERBATIM_CANONICAL_SOURCES[section]))
  );
}

test("cli-inline-canonical-prose-sections: replaces drifted §3 with canonical bytes", async () => {
  const root = makeRoot();
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-2.md", plan({ "3": "Craft line one.\nCraft drift.\nCraft line three." }));

    const result = await runInlineCanonicalProseSectionsCli(["--world-root", root, "--plan", planPath]);
    const output = JSON.parse(result.stdout) as { sections_replaced: string[]; no_change: boolean };

    assert.equal(result.exitCode, 0);
    assert.match(result.stderr, /^\[world-root\].*source: explicit_flag/);
    assert.deepEqual(output.sections_replaced, ["3"]);
    assert.equal(output.no_change, false);
    assert.equal(extractSection(read(planPath), "3"), canonicalBody(root, "3"));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-inline-canonical-prose-sections: replaces drifted §2, §3, and §19", async () => {
  const root = makeRoot();
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(
      tmp,
      "PG-3.md",
      plan({ "2": "Policy drift.", "3": "Craft drift.", "19": "Instruction drift." })
    );

    const result = await runInlineCanonicalProseSectionsCli(["--world-root", root, "--plan", planPath]);
    const output = JSON.parse(result.stdout) as { sections_replaced: string[] };

    assert.equal(result.exitCode, 0);
    assert.deepEqual(output.sections_replaced, ["2", "3", "19"]);
    assert.equal(extractSection(read(planPath), "2"), canonicalBody(root, "2"));
    assert.equal(extractSection(read(planPath), "3"), canonicalBody(root, "3"));
    assert.equal(extractSection(read(planPath), "19"), canonicalBody(root, "19"));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-inline-canonical-prose-sections: idempotent run reports no_change and preserves bytes", async () => {
  const root = makeRoot();
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-4.md", plan());
    const before = read(planPath);

    const result = await runInlineCanonicalProseSectionsCli(["--world-root", root, "--plan", planPath]);
    const output = JSON.parse(result.stdout) as { sections_replaced: string[]; no_change: boolean };

    assert.equal(result.exitCode, 0);
    assert.deepEqual(output.sections_replaced, []);
    assert.equal(output.no_change, true);
    assert.equal(read(planPath), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-inline-canonical-prose-sections: --out writes a separate file and leaves input unchanged", async () => {
  const root = makeRoot();
  const tmp = makeTmpDir();
  try {
    const inputContent = plan({ "19": "Instruction drift." });
    const planPath = writeText(tmp, "PG-5.md", inputContent);
    const outPath = path.join(tmp, "PG-5-inlined.md");

    const result = await runInlineCanonicalProseSectionsCli([
      "--world-root",
      root,
      "--plan",
      planPath,
      "--out",
      outPath
    ]);

    assert.equal(result.exitCode, 0);
    assert.equal(read(planPath), inputContent);
    assert.equal(extractSection(read(outPath), "19"), canonicalBody(root, "19"));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-inline-canonical-prose-sections: missing §3 fails without inventing the section", async () => {
  const root = makeRoot();
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-6.md", plan({ "3": null }));

    const result = await runInlineCanonicalProseSectionsCli(["--world-root", root, "--plan", planPath]);

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /"code": "missing_section"/);
    assert.match(result.stderr, /"section": "3"/);
    assert.equal(read(planPath), plan({ "3": null }));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-inline-canonical-prose-sections: missing canonical source reports canonical_source_unreadable", async () => {
  const root = makeRoot({ "3": null });
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-7.md", plan());

    const result = await runInlineCanonicalProseSectionsCli(["--world-root", root, "--plan", planPath]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /"code": "canonical_source_unreadable"/);
    assert.match(result.stderr, /prose-craft-contract\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-inline-canonical-prose-sections: canonical source without framing separator fails", async () => {
  const root = makeRoot({ "19": "No separator\nInstruction line one." });
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-8.md", plan());

    const result = await runInlineCanonicalProseSectionsCli(["--world-root", root, "--plan", planPath]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /"code": "missing_framing_separator"/);
    assert.match(result.stderr, /render-time-instruction\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-inline-canonical-prose-sections: missing plan reports plan_not_found", async () => {
  const root = makeRoot();
  try {
    const result = await runInlineCanonicalProseSectionsCli([
      "--world-root",
      root,
      "--plan",
      path.join(root, "missing.md")
    ]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /"code": "plan_not_found"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
