import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { createServer } from "../../src/server/http.js";
import type { SegmentSidecar } from "../../src/schema/manual-story.js";
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

function mkWorld(): { repoRoot: string; worldSlug: string; msSlug: string; root: ManualStoryRoot } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "prompts-routes-"));
  const worldSlug = "fixture-world";
  const msSlug = "fixture-story";
  mkdirSync(path.join(repoRoot, "worlds", worldSlug), { recursive: true });
  // COPY (never symlink) the docs trees so cleanup cannot traverse a
  // symlink and remove the real docs.
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
        "Test Story",
        "2026-05-30T00:00:00.000Z",
      ),
    ),
  );
  // Seed one cast member.
  safeWriteFile(
    root,
    "records/cast/mchar-1.yaml",
    YAML.stringify(fixtureCast("mchar-1", "Jon")),
  );
  return { repoRoot, worldSlug, msSlug, root };
}

function seedSegmentSidecar(
  root: ManualStoryRoot,
  id: string,
  promptId: string | null,
): void {
  const numericSuffix = Number(/^SEG-(\d+)$/.exec(id)?.[1] ?? 0);
  const timestamp = `2026-05-31T10:${String(numericSuffix).padStart(2, "0")}:00.000Z`;
  const sidecar: SegmentSidecar = {
    id,
    created_at: timestamp,
    updated_at: timestamp,
    title: id,
    prompt_id: promptId,
    prompt_sha256: promptId ? `${promptId}-sha` : null,
    moment_directive: promptId ? `Directive for ${promptId}` : "",
    selected_template: null,
    included_record_summary: { characters: [], records: [] },
    author_note: "",
    word_count: 3,
  };
  safeWriteFile(root, `segments/${id}.md`, `${id} prose.\n`);
  safeWriteFile(root, `segments/${id}.yaml`, YAML.stringify(sidecar));
}

test("POST /prompts/preview returns 200 with markdown+lint for a valid input", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const promptsDirBefore = path.join(root.absolutePath, "prompts");
      const countBefore = existsSync(promptsDirBefore)
        ? readdirSync(promptsDirBefore).length
        : 0;
      const r = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        payload: {
          moment_directive: "Jon hesitates.",
          included_cast: ["mchar-1"],
          included_records: [],
        },
      });
      assert.equal(r.statusCode, 200);
      const body = r.json() as { markdown: string; lint: { cleanForCopy: boolean } };
      assert.ok(body.markdown.includes("## 1. Content Policy"));
      // preview must NOT write to disk
      const countAfter = existsSync(promptsDirBefore)
        ? readdirSync(promptsDirBefore).length
        : 0;
      assert.equal(countBefore, countAfter);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST /prompts/preview returns 404 for unknown manual story", async () => {
  const { repoRoot, worldSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const r = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/no-such-story/prompts/preview`,
        payload: { moment_directive: "x", included_cast: [], included_records: [] },
      });
      assert.equal(r.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST /prompts returns 201 with PROMPT-1 for a clean save", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const r = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "Jon stays.",
          included_cast: ["mchar-1"],
          included_records: [],
        },
      });
      assert.equal(r.statusCode, 201);
      const body = r.json() as { id: string };
      assert.equal(body.id, "PROMPT-1");
      assert.ok(
        existsSync(path.join(root.absolutePath, "prompts", "PROMPT-1.md")),
      );
      assert.ok(
        existsSync(path.join(root.absolutePath, "prompt-runs", "PROMPT-1.yaml")),
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST /prompts returns 409 lint_blocks_save when hard finding + no override", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const r = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "Jon stays.",
          included_cast: ["mchar-1", "mchar-99"], // mchar-99 doesn't exist
          included_records: [],
        },
      });
      assert.equal(r.statusCode, 409);
      const body = r.json() as { error: string; findings: Array<{ tier: string }> };
      assert.equal(body.error, "lint_blocks_save");
      assert.ok(body.findings.some((f) => f.tier === "hard"));
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST /prompts ignores lint_override and still blocks hard findings", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      // SPEC-106: lint_override no longer bypasses the save-blocking lint gate.
      const r = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "Jon stays.",
          included_cast: ["mchar-1", "mchar-77"],
          included_records: [],
          lint_override: {
            findings: [
              { rule: "selected_cast_exists", tier: "hard", message: "mchar-77 missing" },
            ],
            copied_anyway_at: "2026-05-30T13:00:00Z",
          },
        },
      });
      assert.equal(r.statusCode, 409);
      const body = r.json() as { error: string; findings: Array<{ tier: string }> };
      assert.equal(body.error, "lint_blocks_save");
      assert.ok(body.findings.some((f) => f.tier === "hard"));
      const sidecarPath = path.join(
        root.absolutePath,
        "prompt-runs",
        "PROMPT-1.yaml",
      );
      assert.equal(existsSync(sidecarPath), false);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET /prompts lists saved prompts", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "First save.",
          included_cast: ["mchar-1"],
          included_records: [],
        },
      });
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "Second save.",
          included_cast: ["mchar-1"],
          included_records: [],
        },
      });
      const list = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
      });
      const body = list.json() as {
        prompts: Array<{
          id: string;
          moment_directive_snippet: string;
          linked_segments: string[];
        }>;
      };
      assert.equal(body.prompts.length, 2);
      assert.equal(body.prompts[0]?.id, "PROMPT-1");
      assert.deepEqual(body.prompts[0]?.linked_segments, []);
      assert.equal(body.prompts[1]?.id, "PROMPT-2");
      assert.deepEqual(body.prompts[1]?.linked_segments, []);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET /prompts returns linked segment ids in numeric SEG order", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "First prompt.",
          included_cast: ["mchar-1"],
          included_records: [],
        },
      });
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "Second prompt.",
          included_cast: ["mchar-1"],
          included_records: [],
        },
      });
      seedSegmentSidecar(root, "SEG-10", "PROMPT-1");
      seedSegmentSidecar(root, "SEG-1", "PROMPT-1");
      seedSegmentSidecar(root, "SEG-3", "PROMPT-1");
      seedSegmentSidecar(root, "SEG-2", "PROMPT-2");
      seedSegmentSidecar(root, "SEG-4", null);

      const list = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
      });
      assert.equal(list.statusCode, 200);
      const body = list.json() as {
        prompts: Array<{ id: string; linked_segments: string[] }>;
      };
      const byId = new Map(body.prompts.map((prompt) => [prompt.id, prompt]));
      assert.deepEqual(byId.get("PROMPT-1")?.linked_segments, [
        "SEG-1",
        "SEG-3",
        "SEG-10",
      ]);
      assert.deepEqual(byId.get("PROMPT-2")?.linked_segments, ["SEG-2"]);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("GET /prompts/:id returns markdown+sidecar; 404 for unknown id", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1"],
          included_records: [],
        },
      });
      const r1 = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/PROMPT-1`,
      });
      assert.equal(r1.statusCode, 200);
      const body1 = r1.json() as { markdown: string; sidecar: { id: string } };
      assert.ok(body1.markdown.includes("## 1. Content Policy"));
      assert.equal(body1.sidecar.id, "PROMPT-1");

      const r2 = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/PROMPT-999`,
      });
      assert.equal(r2.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

function seedBeatTemplate(root: ManualStoryRoot, id: string): string {
  const body = {
    id,
    title: id,
    active: true,
    classification: {
      move_family: "observation",
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
    beat_guidance: [{ function: "setup", instruction: "Beat" }],
    forbidden_inventions: [],
    author_notes: "",
  };
  const rel = `records/beat-templates/${id}.yaml`;
  safeWriteFile(root, rel, YAML.stringify(body));
  return path.join(root.absolutePath, rel);
}

test("POST /prompts/preview accepts selected_template ID and resolves to path", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    seedBeatTemplate(root, "mtemplate-1");
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
      // Section 6 should now carry the template body, not "(none selected)"
      assert.ok(!body.markdown.includes("(none selected)"));
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST /prompts/preview accepts legacy included_template_path (back-compat)", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const fullPath = seedBeatTemplate(root, "mtemplate-2");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1"],
          included_records: [],
          included_template_path: fullPath,
        },
      });
      assert.equal(response.statusCode, 200);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST /prompts/preview rejects both selected_template AND included_template_path → 400", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const fullPath = seedBeatTemplate(root, "mtemplate-3");
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/prompts/preview`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1"],
          included_records: [],
          selected_template: "mtemplate-3",
          included_template_path: fullPath,
        },
      });
      assert.equal(response.statusCode, 400);
      const body = response.json() as { message: string };
      assert.match(body.message, /exactly one/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("POST /prompts/preview returns 404 when selected_template does not exist on disk", async () => {
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
          selected_template: "mtemplate-99",
        },
      });
      assert.equal(response.statusCode, 404);
      const body = response.json() as { error: string };
      assert.equal(body.error, "template_not_found");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
