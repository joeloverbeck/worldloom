import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { createServer } from "../../src/server/http.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
} from "../../src/write/sandbox.js";

function mkWorld() {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "manual-studio-beat-templates-routes-"),
  );
  const worldSlug = "test-world";
  const msSlug = "test-story";
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
        "T",
        "2026-05-31T00:00:00.000Z",
      ),
    ),
  );
  return { repoRoot, worldSlug, msSlug, root };
}

function validTemplateBody(): Record<string, unknown> {
  return {
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
      tags: ["hurt"],
      intensity: "general",
      tone_fit: ["tense"],
    },
    role_slots: {
      initiator: { compatible_roles: ["viewpoint"] },
    },
    requires: {
      record_classes_any: [],
      record_tags_any: [],
      relationship_axes_any: [],
      location_tags_any: [],
    },
    excludes: { record_tags_any: [], forbidden_if_secret_tags: [] },
    beat_guidance: [{ function: "setup", instruction: "Frame." }],
    forbidden_inventions: [],
    author_notes: "",
  };
}

test("beat-templates: POST → GET (list) → GET (single) → PUT → DELETE round-trip", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const create = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates`,
        payload: { record: validTemplateBody() },
      });
      assert.equal(create.statusCode, 201);
      const created = create.json() as { id: string; template: { id: string } };
      assert.equal(created.id, "mtemplate-1");
      assert.equal(created.template.id, "mtemplate-1");

      const list = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates`,
      });
      assert.equal(list.statusCode, 200);
      const listBody = list.json() as { templates: Array<{ id: string }> };
      assert.equal(listBody.templates.length, 1);

      const single = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates/mtemplate-1`,
      });
      assert.equal(single.statusCode, 200);

      const updated = {
        ...validTemplateBody(),
        title: "Updated",
      };
      const put = await server.inject({
        method: "PUT",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates/mtemplate-1`,
        payload: { record: updated },
      });
      assert.equal(put.statusCode, 200);
      const putBody = put.json() as { template: { title: string } };
      assert.equal(putBody.template.title, "Updated");

      const del = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates/mtemplate-1`,
      });
      assert.equal(del.statusCode, 200);
      const delBody = del.json() as { outcome: string };
      assert.equal(delBody.outcome, "hard_deleted");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("beat-templates: POST with invalid body → 400 validation_failed with violations", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const broken = validTemplateBody();
      // beat_guidance length 0 should fail
      (broken as Record<string, unknown>).beat_guidance = [];
      const create = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates`,
        payload: { record: broken },
      });
      assert.equal(create.statusCode, 400);
      const body = create.json() as { error: string; violations: unknown[] };
      assert.equal(body.error, "validation_failed");
      assert.ok(body.violations.length > 0);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("beat-templates: candidate route returns filter output shape", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      // Seed: one template
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates`,
        payload: { record: validTemplateBody() },
      });
      const candidates = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer/template-candidates`,
        payload: {
          moment_directive: "x",
          selected_cast: [],
        },
      });
      assert.equal(candidates.statusCode, 200);
      const body = candidates.json() as {
        candidates: Array<{
          template: { id: string };
          why_suggested: string[];
          advisory_flags: { recently_used: boolean };
        }>;
      };
      assert.ok(Array.isArray(body.candidates));
      // Template requires nothing, so it should appear regardless of cast
      // (but stage 3 role-slot fit may exclude due to needing viewpoint
      // cast). Without cast, the initiator slot fails — assert 0.
      assert.equal(body.candidates.length, 0);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("beat-templates: candidate route threads optional_desired_pressure_type", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const nonMatch = {
        ...validTemplateBody(),
        title: "A Nonmatching Pressure",
        pressure_type: "choice",
        role_slots: {},
      };
      const match = {
        ...validTemplateBody(),
        title: "Z Matching Pressure",
        pressure_type: "intimacy",
        role_slots: {},
      };
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates`,
        payload: { record: nonMatch },
      });
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates`,
        payload: { record: match },
      });

      const noPin = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer/template-candidates`,
        payload: {
          moment_directive: "x",
          selected_cast: [],
        },
      });
      assert.equal(noPin.statusCode, 200);
      const noPinBody = noPin.json() as {
        candidates: Array<{ template: { title: string } }>;
      };
      assert.deepEqual(
        noPinBody.candidates.map((c) => c.template.title),
        ["A Nonmatching Pressure", "Z Matching Pressure"],
      );

      const withPin = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer/template-candidates`,
        payload: {
          moment_directive: "x",
          selected_cast: [],
          optional_desired_pressure_type: "intimacy",
        },
      });
      assert.equal(withPin.statusCode, 200);
      const withPinBody = withPin.json() as {
        candidates: Array<{ template: { title: string }; why_suggested: string[] }>;
      };
      assert.deepEqual(
        withPinBody.candidates.map((c) => c.template.title),
        ["Z Matching Pressure", "A Nonmatching Pressure"],
      );
      assert.ok(
        withPinBody.candidates[0]!.why_suggested.includes("pressure: intimacy"),
      );
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("beat-templates: GET /records/beat-templates returns 404 with pointer", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const detail = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/beat-templates/mtemplate-1`,
      });
      assert.equal(detail.statusCode, 404);
      const body = detail.json() as { error: string; message: string };
      assert.equal(body.error, "wrong_url_space");
      assert.match(body.message, /\/beat-templates/);

      const list = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=beat-templates`,
      });
      assert.equal(list.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("beat-templates: DELETE on missing template → 404", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const del = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/beat-templates/mtemplate-99`,
      });
      assert.equal(del.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
