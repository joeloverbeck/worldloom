import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../src/server/http.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
} from "../../src/write/sandbox.js";

import YAML from "yaml";

function mkWorld() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-routes-"));
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
        "2026-05-30T00:00:00.000Z",
      ),
    ),
  );
  return { repoRoot, worldSlug, msSlug, root };
}

function validFactBody(): Record<string, unknown> {
  return {
    title: "T",
    active: true,
    importance: "medium",
    tags: [],
    summary: "",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    notes: "",
  };
}

function validCastBody(): Record<string, unknown> {
  return {
    ...validFactBody(),
    display_name: "Ane Arrieta",
    roles: ["viewpoint"],
    identity: {
      one_line: "one",
      public_face: "pf",
      private_pressure: "pp",
    },
    world_pressure_core: {
      world_produced_wound: "w",
      active_appetite: "a",
      self_mythology: "s",
      irreconcilable_contradiction: "i",
      relational_charge: "r",
      moral_psychological_edge: "m",
      cannot_be_swapped_out_because: "c",
    },
    body_and_presence: {
      physicality: "p",
      body_limits: "b",
      habitual_gestures: "h",
      clothing_or_presentation: "c",
      social_presentation: "s",
    },
    voice: {
      baseline: "b",
      under_pressure: "u",
      intimacy: "i",
      evasion: "e",
      anger: "a",
      lying: "l",
      anti_generic_warnings: [],
    },
    pressure_behavior: {
      cornered: "c",
      tempted: "t",
      humiliated: "h",
      protecting_attachment: "p",
      offered_power: "o",
    },
    perception_and_embodiment: {
      notices: "n",
      misses: "m",
      misreads: "mr",
      sensory_bias: "s",
    },
    agency_and_planning: {
      default_strategy: "d",
      risk_style: "r",
      fallback_style: "f",
      planning_blind_spots: "p",
    },
    relationship_behavior: {},
    prose_constraints: {
      prose_must_not_imply: [],
      forbidden_inventions: [],
      voice_do_not_do: [],
    },
  };
}

test("records routes: POST happy path → 201 with id+record", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts`,
        payload: { record: validFactBody() },
      });
      assert.equal(response.statusCode, 201);
      const body = response.json() as { id: string; record: { id: string } };
      assert.equal(body.id, "mfact-1");
      assert.equal(body.record.id, "mfact-1");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: POST allocated id wins over body id", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/cast`,
        payload: { record: { ...validCastBody(), id: "" } },
      });
      assert.equal(response.statusCode, 201);
      const body = response.json() as { id: string; record: { id: string } };
      assert.equal(body.id, "mchar-1");
      assert.equal(body.record.id, "mchar-1");
      const persisted = YAML.parse(
        readFileSync(
          path.join(root.absolutePath, "records", "cast", "mchar-1.yaml"),
          "utf8",
        ),
      ) as { id: string };
      assert.equal(persisted.id, "mchar-1");

      const wrongIdResponse = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/cast`,
        payload: { record: { ...validCastBody(), id: "garbage" } },
      });
      assert.equal(wrongIdResponse.statusCode, 201);
      const wrongIdBody = wrongIdResponse.json() as {
        id: string;
        record: { id: string };
      };
      assert.equal(wrongIdBody.id, "mchar-2");
      assert.equal(wrongIdBody.record.id, "mchar-2");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: GET list returns summaries; GET by id returns full record", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts`,
        payload: { record: validFactBody() },
      });
      const list = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=facts`,
      });
      assert.equal(list.statusCode, 200);
      const listBody = list.json() as { records: Array<{ id: string }> };
      assert.equal(listBody.records.length, 1);
      assert.equal(listBody.records[0]?.id, "mfact-1");

      const detail = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts/mfact-1`,
      });
      assert.equal(detail.statusCode, 200);
      const detailBody = detail.json() as { record: { id: string; title: string } };
      assert.equal(detailBody.record.id, "mfact-1");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: POST schema-fail → 400 validation_failed", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const body = validFactBody();
      delete body.title;
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts`,
        payload: { record: body },
      });
      assert.equal(response.statusCode, 400);
      const respBody = response.json() as { error: string };
      assert.equal(respBody.error, "validation_failed");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: POST refs-fail without override → 400 broken_refs needsOverride", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/beliefs`,
        payload: {
          record: {
            ...validFactBody(),
            holder: "mchar-99",
            truth_relation: "true",
            confidence: "low",
          },
        },
      });
      assert.equal(response.statusCode, 400);
      const respBody = response.json() as {
        error: string;
        needsOverride: boolean;
        violations: unknown[];
      };
      assert.equal(respBody.error, "broken_refs");
      assert.equal(respBody.needsOverride, true);
      assert.ok(respBody.violations.length > 0);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: POST refs-fail with overrideBrokenRefs → 201", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/beliefs`,
        payload: {
          record: {
            ...validFactBody(),
            holder: "mchar-99",
            truth_relation: "true",
            confidence: "low",
          },
          overrideBrokenRefs: true,
        },
      });
      assert.equal(response.statusCode, 201);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: DELETE without force on unreferenced → hard_deleted", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts`,
        payload: { record: validFactBody() },
      });
      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts/mfact-1`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as { outcome: string };
      assert.equal(body.outcome, "hard_deleted");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: DELETE force requires repair mode and writes repair log", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts`,
        payload: { record: validFactBody() },
      });
      const blocked = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts/mfact-1?force=true`,
      });
      assert.equal(blocked.statusCode, 405);
      assert.equal(blocked.json().error, "repair-mode-required");
      assert.equal(
        existsSync(
          path.join(
            repoRoot,
            "worlds",
            worldSlug,
            "manual-stories",
            msSlug,
            "records",
            "facts",
            "mfact-1.yaml",
          ),
        ),
        true,
      );

      const response = await server.inject({
        method: "DELETE",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts/mfact-1?force=true&mode=repair`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        outcome: string;
        auditEntry: { deletedClassAndId: string };
      };
      assert.equal(body.outcome, "force_deleted");
      assert.equal(body.auditEntry.deletedClassAndId, "facts/mfact-1");
      const repairLog = YAML.parse(
        readFileSync(
          path.join(
            repoRoot,
            "worlds",
            worldSlug,
            "manual-stories",
            msSlug,
            "repair-log.yaml",
          ),
          "utf8",
        ),
      ) as Array<{ deleted_class_and_id: string }>;
      assert.equal(repairLog[0]?.deleted_class_and_id, "facts/mfact-1");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: GET missing → 404", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/facts/mfact-99`,
      });
      assert.equal(response.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: GET list with corrupt record → 409 HealthReport", async () => {
  const { repoRoot, worldSlug, msSlug, root } = mkWorld();
  try {
    mkdirSync(path.join(root.absolutePath, "records", "facts"), {
      recursive: true,
    });
    writeFileSync(
      path.join(root.absolutePath, "records", "facts", "mfact-1.yaml"),
      "title: [unterminated\n",
    );
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=facts`,
      });

      assert.equal(response.statusCode, 409);
      const body = response.json() as {
        status: string;
        findings: Array<{ code: string }>;
      };
      assert.equal(body.status, "blocked");
      assert.equal(body.findings[0]?.code, "yaml_parse_failed");
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: GET on missing world → 404", async () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-routes-"));
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/missing/manual-stories/missing/records?class=facts`,
      });
      assert.equal(response.statusCode, 404);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("records routes: POST with unknown class → 400 bad_request", async () => {
  const { repoRoot, worldSlug, msSlug } = mkWorld();
  try {
    const server = await createServer({ repoRoot });
    try {
      const response = await server.inject({
        method: "POST",
        url: `/api/worlds/${worldSlug}/manual-stories/${msSlug}/records/unicorns`,
        payload: { record: validFactBody() },
      });
      assert.equal(response.statusCode, 400);
    } finally {
      await server.close();
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
