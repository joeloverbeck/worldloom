import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { composePrompt } from "../../src/prompt/compose.js";
import { emitSection12 } from "../../src/prompt/sections/section-12-forbidden-inventions-and-reveals.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";
import { fixtureCast } from "./fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// dist/test/prompt -> dist/test -> dist -> manual-story-studio -> tools -> repo
const REPO_ROOT = path.resolve(HERE, "../../../../../");

function mkRepo() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "sec6-template-"));
  const worldSlug = "fixture-world";
  const msSlug = "fixture-story";
  mkdirSync(path.join(repoRoot, "worlds", worldSlug), { recursive: true });
  mkdirSync(path.join(repoRoot, "docs"), { recursive: true });
  cpSync(
    path.join(REPO_ROOT, "docs/prose-renderer-contract"),
    path.join(repoRoot, "docs/prose-renderer-contract"),
    { recursive: true },
  );
  cpSync(
    path.join(REPO_ROOT, "docs/manual-story-studio"),
    path.join(repoRoot, "docs/manual-story-studio"),
    { recursive: true },
  );
  const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
  mkdirSync(root.absolutePath, { recursive: true });
  safeWriteFile(
    root,
    "manual-story.yaml",
    YAML.stringify(
      makeDefaultManualStoryMetadata(
        worldSlug,
        msSlug,
        "T",
        "2026-05-31T00:00:00.000Z",
      ),
    ),
  );
  safeWriteFile(
    root,
    "records/cast/mchar-1.yaml",
    YAML.stringify(fixtureCast("mchar-1", "Jon")),
  );
  return { repoRoot, worldSlug, msSlug, root };
}

function writeTemplate(
  root: ManualStoryRoot,
  body: Record<string, unknown>,
): string {
  const id = body.id as string;
  const rel = `records/beat-templates/${id}.yaml`;
  safeWriteFile(root, rel, YAML.stringify(body));
  return path.join(root.absolutePath, rel);
}

function templateBody(): Record<string, unknown> {
  return {
    id: "mtemplate-1",
    title: "Soft Confrontation",
    active: true,
    pressure_type: "intimacy",
    turn_type: "escalation",
    preconditions_text: "",
    do_not_resolve: [],
    expected_state_review: ["relationships"],
    stop_after: "",
    anti_patterns: [],
    classification: {
      move_family: "confrontation",
      tags: [],
      intensity: "general",
      tone_fit: [],
    },
    role_slots: {},
    requires: {
      record_classes_any: [],
      record_tags_any: [],
      relationship_axes_any: [],
      location_tags_any: [],
    },
    excludes: { record_tags_any: [], forbidden_if_secret_tags: [] },
    beat_guidance: [
      { function: "setup", instruction: "Bring them into the same room." },
      { function: "pressure", instruction: "Let one ask the question." },
      { function: "exit", instruction: "Allow the other to retreat." },
    ],
    forbidden_inventions: ["new sibling", "off-screen confession"],
    author_notes: "",
  };
}

function extractSection(markdown: string, sectionNum: number): string {
  const start = markdown.indexOf(`## ${sectionNum}. `);
  assert.ok(start !== -1, `section ${sectionNum} not found`);
  const next = markdown.indexOf(`\n## ${sectionNum + 1}. `, start);
  return next === -1
    ? markdown.slice(start)
    : markdown.slice(start, next);
}

test("compose stage 5: selected template renders beat_guidance into §6 as Markdown list", async () => {
  const { repoRoot, root } = mkRepo();
  try {
    const tplPath = writeTemplate(root, templateBody());
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot,
      moment_directive: "x",
      included_cast: ["mchar-1"],
      included_records: [],
      included_template_path: tplPath,
    });
    const section6 = extractSection(result.markdown, 6);
    assert.match(section6, /- \*\*setup\*\*: Bring them into the same room\./);
    assert.match(section6, /- \*\*pressure\*\*: Let one ask the question\./);
    assert.match(section6, /- \*\*exit\*\*: Allow the other to retreat\./);
    assert.ok(!section6.includes("(none selected)"));
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("compose stage 5: template forbidden_inventions threaded into §12", async () => {
  const { repoRoot, root } = mkRepo();
  try {
    const tplPath = writeTemplate(root, templateBody());
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot,
      moment_directive: "x",
      included_cast: ["mchar-1"],
      included_records: [],
      included_template_path: tplPath,
    });
    const section12 = extractSection(result.markdown, 12);
    assert.match(section12, /Template forbids inventing: new sibling/);
    assert.match(section12, /Template forbids inventing: off-screen confession/);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("compose stage 5: no template → §6 reads '(none selected)' (back-compat)", async () => {
  const { repoRoot, root } = mkRepo();
  try {
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot,
      moment_directive: "x",
      included_cast: ["mchar-1"],
      included_records: [],
    });
    const section6 = extractSection(result.markdown, 6);
    assert.match(section6, /\(none selected\)/);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("compose stage 5: malformed template YAML surfaces hard lint finding", async () => {
  const { repoRoot, root } = mkRepo();
  try {
    mkdirSync(path.join(root.absolutePath, "records/beat-templates"), {
      recursive: true,
    });
    writeFileSync(
      path.join(root.absolutePath, "records/beat-templates/mtemplate-bad.yaml"),
      ": : not valid : yaml :\n",
    );
    const result = await composePrompt({
      manualStoryRoot: root.absolutePath,
      repoRoot,
      moment_directive: "x",
      included_cast: ["mchar-1"],
      included_records: [],
      included_template_path: path.join(
        root.absolutePath,
        "records/beat-templates/mtemplate-bad.yaml",
      ),
    });
    assert.ok(
      result.lint.findings.some(
        (f) => f.rule === "selected_template_valid" && f.tier === "hard",
      ),
    );
    assert.equal(result.lint.blockingForCopy, true);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("compose stage 5: determinism — identical inputs produce identical Markdown", async () => {
  const { repoRoot, root } = mkRepo();
  try {
    const tplPath = writeTemplate(root, templateBody());
    const args = {
      manualStoryRoot: root.absolutePath,
      repoRoot,
      moment_directive: "x",
      included_cast: ["mchar-1"],
      included_records: [] as string[],
      included_template_path: tplPath,
    };
    const a = await composePrompt(args);
    const b = await composePrompt(args);
    assert.equal(a.markdown, b.markdown);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("emitSection12: template_forbidden_inventions emitted when present", () => {
  const body = emitSection12({
    metadata: {} as never,
    cast: [],
    records: [],
    included_cast_ids: [],
    moment_directive: "",
    included_template_body: null,
    template_forbidden_inventions: ["off-screen confession"],
    recent_segment_last_paragraph: null,
    content_policy_body: "",
    prose_craft_contract_body: "",
  });
  assert.match(body, /Template forbids inventing: off-screen confession/);
});

test("emitSection12: omitted template_forbidden_inventions preserves back-compat", () => {
  const body = emitSection12({
    metadata: {} as never,
    cast: [],
    records: [],
    included_cast_ids: [],
    moment_directive: "",
    included_template_body: null,
    recent_segment_last_paragraph: null,
    content_policy_body: "",
    prose_craft_contract_body: "",
  });
  // Default "no constraints" message preserved
  assert.match(body, /No forbidden inventions or reveals declared/);
});
