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
import { createServer } from "../../src/server/http.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";
import { fixtureCast } from "../prompt/fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// dist/test/server -> dist/test -> dist -> manual-story-studio -> tools -> repo
const REPO_ROOT = path.resolve(HERE, "../../../../../");

function mkWorld(): {
  repoRoot: string;
  worldSlug: string;
  msSlug: string;
  root: ManualStoryRoot;
} {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "template-contain-"));
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
        "Template Containment",
        "2026-06-02T00:00:00.000Z",
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

function templateBody(id: string, instruction = "Contained beat"): Record<string, unknown> {
  return {
    id,
    title: "Contained",
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
    beat_guidance: [{ function: "setup", instruction }],
    forbidden_inventions: [],
    author_notes: "",
  };
}

function seedBeatTemplate(
  root: ManualStoryRoot,
  id: string,
  instruction?: string,
): string {
  const rel = `records/beat-templates/${id}.yaml`;
  safeWriteFile(root, rel, YAML.stringify(templateBody(id, instruction)));
  return path.join(root.absolutePath, rel);
}

test("compose preview rejects absolute template input fields before reading outside the sandbox", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  const outside = path.join(repoRoot, "outside-template.yaml");
  writeFileSync(outside, YAML.stringify(templateBody("mtemplate-1", "SECRET OUTSIDE READ")));
  try {
    const server = await createServer({ repoRoot });
    try {
      const selectedTemplate = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1"],
          included_records: [],
          selected_template: outside,
        },
      });
      assert.equal(selectedTemplate.statusCode, 400);
      assert.doesNotMatch(selectedTemplate.body, /SECRET OUTSIDE READ/);

      const removedField = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1"],
          included_records: [],
          included_template_path: outside,
        },
      });
      assert.equal(removedField.statusCode, 400);
      assert.doesNotMatch(removedField.body, /SECRET OUTSIDE READ/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("compose preview rejects traversal selected_template before reading outside the sandbox", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1"],
          included_records: [],
          selected_template: "../../../_source/canon/CF-1",
        },
      });
      assert.equal(response.statusCode, 400);
      const body = response.json() as { message: string };
      assert.match(body.message, /mtemplate-<integer>/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("compose preview accepts a contained selected_template id", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    seedBeatTemplate(root, "mtemplate-1", "Contained marker");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1"],
          included_records: [],
          selected_template: "mtemplate-1",
        },
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { markdown: string };
      assert.match(body.markdown, /Contained marker/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("composePrompt refuses an internal template path outside the manual-story sandbox", async () => {
  const { repoRoot, root } = mkWorld();
  const outside = path.join(repoRoot, "outside-template.yaml");
  writeFileSync(outside, YAML.stringify(templateBody("mtemplate-1", "SECRET OUTSIDE READ")));
  try {
    const result = await composePrompt({
      repoRoot,
      manualStoryRoot: root.absolutePath,
      moment_directive: "x",
      included_cast: ["mchar-1"],
      included_records: [],
      included_template_path: outside,
    });

    assert.doesNotMatch(result.markdown, /SECRET OUTSIDE READ/);
    assert.ok(
      result.lint.findings.some(
        (finding) =>
          finding.rule === "selected_template_valid" &&
          finding.tier === "hard" &&
          finding.message.includes("outside the manual-story sandbox"),
      ),
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
