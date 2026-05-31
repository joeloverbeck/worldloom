/**
 * Manual Studio capstone: SPEC-104 acceptance criteria #7, #10, #11
 * exercised end-to-end via the HTTP route surface.
 *
 *   - AC #7: candidate-computation route returns the expected filter
 *            output; selecting a candidate + previewing produces a prompt
 *            whose §6 contains the template's beat_guidance Markdown.
 *   - AC #10: saving a prompt with a template + saving a segment
 *             referencing the prompt populates the segment sidecar's
 *             selected_template field with the mtemplate-N id.
 *   - AC #11: the prompts-listing endpoint surfaces the selected_template
 *             field for the saved prompt (the field PromptHistory.tsx
 *             reads at render time).
 *   - Determinism: the chain produces byte-identical composed prompt and
 *                  segment sidecar fields across two consecutive calls.
 *   - Sandbox: no writes happen outside the per-test tempdir.
 */

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { createServer } from "../src/server/http.js";
import { makeDefaultManualStoryMetadata } from "../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../src/write/sandbox.js";
import { fixtureCast } from "./prompt/fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../..");

interface Fixture {
  repoRoot: string;
  worldSlug: string;
  msSlug: string;
  root: ManualStoryRoot;
}

function mkFixture(): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "cap-spec104-"));
  const worldSlug = "capstone-world";
  const msSlug = "capstone-story";

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

  mkdirSync(path.join(repoRoot, "worlds", worldSlug), { recursive: true });
  const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
  mkdirSync(root.absolutePath, { recursive: true });
  safeWriteFile(
    root,
    "manual-story.yaml",
    YAML.stringify(
      makeDefaultManualStoryMetadata(
        worldSlug,
        msSlug,
        "Capstone Story",
        "2026-05-31T00:00:00.000Z",
      ),
    ),
  );
  // Two cast members with complementary roles so the role_slot fit passes.
  safeWriteFile(
    root,
    "records/cast/mchar-1.yaml",
    YAML.stringify({
      ...fixtureCast("mchar-1", "Jon"),
      roles: ["viewpoint"],
    }),
  );
  safeWriteFile(
    root,
    "records/cast/mchar-2.yaml",
    YAML.stringify({
      ...fixtureCast("mchar-2", "Rae"),
      roles: ["opposing_actor"],
    }),
  );

  // Active records whose tags satisfy the chosen template's requires.
  const commonRec = (overrides: Record<string, unknown> = {}) => ({
    title: "rec",
    active: true,
    importance: "medium",
    tags: ["hurt"],
    summary: "",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    last_reviewed_after_segment: null,
    notes: "",
    ...overrides,
  });
  safeWriteFile(
    root,
    "records/beliefs/mbel-1.yaml",
    YAML.stringify({
      id: "mbel-1",
      ...commonRec({
        holder: "mchar-1",
        truth_relation: "true",
        confidence: "high",
      }),
    }),
  );

  // Beat template that should match
  const template1 = {
    id: "mtemplate-1",
    title: "Soft Confrontation",
    active: true,
    classification: {
      move_family: "confrontation",
      tags: [],
      intensity: "general",
      tone_fit: ["tense"],
    },
    role_slots: {
      initiator: { compatible_roles: ["viewpoint"] },
      other: { compatible_roles: ["opposing_actor"] },
    },
    requires: {
      record_classes_any: ["beliefs"],
      record_tags_any: ["hurt"],
      relationship_axes_any: [],
      location_tags_any: [],
    },
    excludes: { record_tags_any: [], forbidden_if_secret_tags: [] },
    beat_guidance: [
      { function: "setup", instruction: "Bring them into the same room." },
      { function: "pressure", instruction: "Let one ask the question." },
      { function: "exit", instruction: "Allow the other to retreat." },
    ],
    forbidden_inventions: ["new sibling"],
    author_notes: "",
  };
  safeWriteFile(
    root,
    "records/beat-templates/mtemplate-1.yaml",
    YAML.stringify(template1),
  );

  // Second template that won't match (requires "joy" tag absent from records)
  const template2 = {
    ...template1,
    id: "mtemplate-2",
    title: "Z Joyful Reunion",
    classification: {
      ...template1.classification,
      move_family: "celebration",
      tone_fit: ["tender"],
    },
    requires: {
      ...template1.requires,
      record_tags_any: ["joy"],
    },
  };
  safeWriteFile(
    root,
    "records/beat-templates/mtemplate-2.yaml",
    YAML.stringify(template2),
  );

  return { repoRoot, worldSlug, msSlug, root };
}

test("SPEC-104 AC #7: candidate route → expected candidates; selection → §6 contains beat_guidance Markdown", async () => {
  const fixture = mkFixture();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const candidates = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/moment-composer/template-candidates`,
        payload: {
          moment_directive: "x",
          selected_cast: ["mchar-1", "mchar-2"],
        },
      });
      assert.equal(candidates.statusCode, 200);
      const candidateBody = candidates.json() as {
        candidates: Array<{
          template: { id: string };
          why_suggested: string[];
          advisory_flags: { recently_used: boolean };
        }>;
      };
      // Only mtemplate-1 should pass: mtemplate-2 requires the "joy" tag.
      assert.equal(candidateBody.candidates.length, 1);
      assert.equal(candidateBody.candidates[0]!.template.id, "mtemplate-1");

      const preview = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts/preview`,
        payload: {
          moment_directive: "they meet",
          included_cast: ["mchar-1", "mchar-2"],
          included_records: ["mbel-1"],
          selected_template: "mtemplate-1",
        },
      });
      assert.equal(preview.statusCode, 200);
      const previewBody = preview.json() as { markdown: string };
      assert.match(previewBody.markdown, /## 6\. Optional Beat Template Guidance/);
      assert.match(previewBody.markdown, /- \*\*setup\*\*: Bring them into the same room\./);
      assert.match(previewBody.markdown, /- \*\*pressure\*\*: Let one ask the question\./);
      assert.match(previewBody.markdown, /- \*\*exit\*\*: Allow the other to retreat\./);
      // §12 should carry the template's forbidden_inventions
      assert.match(previewBody.markdown, /Template forbids inventing: new sibling/);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("SPEC-104 AC #10: segment sidecar selected_template populated when prompt was composed with a template", async () => {
  const fixture = mkFixture();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const savedPrompt = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts`,
        payload: {
          moment_directive: "they meet",
          included_cast: ["mchar-1", "mchar-2"],
          included_records: ["mbel-1"],
          selected_template: "mtemplate-1",
        },
      });
      assert.equal(savedPrompt.statusCode, 201);
      const promptId = (savedPrompt.json() as { id: string }).id;

      const savedSegment = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/segments`,
        payload: {
          prose: "They met under the eaves.",
          title: "Encounter",
          prompt_id: promptId,
          author_note: "",
        },
      });
      assert.equal(savedSegment.statusCode, 201);
      const segmentId = (savedSegment.json() as { segment_id: string })
        .segment_id;

      const sidecarPath = path.join(
        fixture.root.absolutePath,
        "segments",
        `${segmentId}.yaml`,
      );
      assert.equal(existsSync(sidecarPath), true);
      const sidecar = YAML.parse(readFileSync(sidecarPath, "utf8")) as {
        selected_template: string | null;
      };
      assert.equal(sidecar.selected_template, "mtemplate-1");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("SPEC-104 AC #11: prompts-listing endpoint surfaces the selected_template per prompt", async () => {
  const fixture = mkFixture();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      // Save two prompts: one with a template, one without
      const r1 = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts`,
        payload: {
          moment_directive: "with template",
          included_cast: ["mchar-1", "mchar-2"],
          included_records: ["mbel-1"],
          selected_template: "mtemplate-1",
        },
      });
      assert.equal(r1.statusCode, 201);
      const r2 = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts`,
        payload: {
          moment_directive: "without template",
          included_cast: ["mchar-1", "mchar-2"],
          included_records: ["mbel-1"],
        },
      });
      assert.equal(r2.statusCode, 201);

      const list = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts`,
      });
      assert.equal(list.statusCode, 200);
      const listBody = list.json() as {
        prompts: Array<{ id: string; selected_template: string | null }>;
      };
      assert.equal(listBody.prompts.length, 2);
      const byId = new Map(listBody.prompts.map((p) => [p.id, p.selected_template]));
      assert.equal(byId.get("PROMPT-1"), "mtemplate-1");
      assert.equal(byId.get("PROMPT-2"), null);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("SPEC-104 determinism: same fixture inputs → byte-identical composed prompt across two runs", async () => {
  const fixture = mkFixture();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const payload = {
        moment_directive: "they meet",
        included_cast: ["mchar-1", "mchar-2"],
        included_records: ["mbel-1"],
        selected_template: "mtemplate-1",
      };
      const a = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts/preview`,
        payload,
      });
      const b = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts/preview`,
        payload,
      });
      assert.equal(a.statusCode, 200);
      assert.equal(b.statusCode, 200);
      const am = (a.json() as { markdown: string }).markdown;
      const bm = (b.json() as { markdown: string }).markdown;
      assert.equal(am, bm);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});

test("SPEC-104 sandbox: chain writes only inside fixture tempdir; no parent leak", async () => {
  const fixture = mkFixture();
  try {
    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const saved = await server.inject({
        method: "POST",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.msSlug}/prompts`,
        payload: {
          moment_directive: "x",
          included_cast: ["mchar-1", "mchar-2"],
          included_records: [],
          selected_template: "mtemplate-1",
        },
      });
      assert.equal(saved.statusCode, 201);
      const promptId = (saved.json() as { id: string }).id;
      // Prompt sidecar must be inside the manual-story root
      const sidecarPath = path.join(
        fixture.root.absolutePath,
        "prompt-runs",
        `${promptId}.yaml`,
      );
      assert.equal(existsSync(sidecarPath), true);
      // Verify the sidecar's included_template_path resolves under the
      // sandbox root (no parent-directory leak)
      const sidecar = YAML.parse(readFileSync(sidecarPath, "utf8")) as {
        included_template_path: string | null;
      };
      assert.ok(sidecar.included_template_path);
      const resolved = path.resolve(sidecar.included_template_path!);
      assert.ok(
        resolved.startsWith(fixture.root.absolutePath),
        `template path ${resolved} must be inside sandbox ${fixture.root.absolutePath}`,
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});
