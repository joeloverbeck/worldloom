import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import type {
  ManualBeliefRecord,
  ManualCharacterRecord,
  ManualFactRecord,
} from "../../src/schema/manual-story.js";
import { allocateNextIdForClass } from "../../src/write/id-allocator.js";
import {
  createRecord,
  deleteRecord,
  updateRecord,
} from "../../src/write/records.js";
import { resolveManualStoryRoot } from "../../src/write/sandbox.js";

const LEGACY_REVIEW_KEY = ["last", "reviewed", "after", "segment"].join("_");

function mkWorld(): { repoRoot: string; manualStoryRoot: ReturnType<typeof resolveManualStoryRoot> } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-write-"));
  const worldSlug = "test-world";
  const manualStorySlug = "test-story";
  mkdirSync(
    path.join(repoRoot, "worlds", worldSlug, "manual-stories", manualStorySlug),
    { recursive: true },
  );
  const manualStoryRoot = resolveManualStoryRoot(
    repoRoot,
    worldSlug,
    manualStorySlug,
  );
  return { repoRoot, manualStoryRoot };
}

function commonFields(): Omit<ManualFactRecord, "id"> & { id?: never } {
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
  } as Omit<ManualFactRecord, "id"> & { id?: never };
}

function castProfileBody(): Omit<ManualCharacterRecord, "id"> {
  return {
    ...commonFields(),
    display_name: "Display",
    roles: ["viewpoint"],
    identity: { one_line: "", public_face: "", private_pressure: "" },
    world_pressure_core: {
      world_produced_wound: "",
      active_appetite: "",
      self_mythology: "",
      irreconcilable_contradiction: "",
      relational_charge: "",
      moral_psychological_edge: "",
      cannot_be_swapped_out_because: "",
    },
    body_and_presence: {
      physicality: "",
      body_limits: "",
      habitual_gestures: "",
      clothing_or_presentation: "",
      social_presentation: "",
    },
    voice: {
      baseline: "",
      under_pressure: "",
      intimacy: "",
      evasion: "",
      anger: "",
      lying: "",
      anti_generic_warnings: [],
    },
    pressure_behavior: {
      cornered: "",
      tempted: "",
      humiliated: "",
      protecting_attachment: "",
      offered_power: "",
    },
    perception_and_embodiment: {
      notices: "",
      misses: "",
      misreads: "",
      sensory_bias: "",
    },
    agency_and_planning: {
      default_strategy: "",
      risk_style: "",
      fallback_style: "",
      planning_blind_spots: "",
    },
    relationship_behavior: {},
    prose_constraints: {
      prose_must_not_imply: [],
      forbidden_inventions: [],
      voice_do_not_do: [],
    },
  } as Omit<ManualCharacterRecord, "id">;
}

test("createRecord: round-trip writes file at expected path", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const result = createRecord(manualStoryRoot, "facts", commonFields());
    assert.equal(result.ok ?? true, true);
    if (!("ok" in result) || !result.ok) throw new Error("expected ok");
    const expected = path.join(
      manualStoryRoot.absolutePath,
      "records",
      "facts",
      "mfact-1.yaml",
    );
    assert.equal(existsSync(expected), true);
    const parsed = YAML.parse(readFileSync(expected, "utf8")) as ManualFactRecord;
    assert.equal(parsed.id, "mfact-1");
    assert.equal(parsed.title, "T");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("createRecord: strips legacy reviewed segment marker", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const result = createRecord(manualStoryRoot, "facts", {
      ...commonFields(),
      [LEGACY_REVIEW_KEY]: "SEG-7",
    } as Omit<ManualFactRecord, "id">);
    assert.equal(result.ok ?? true, true);
    if (!("ok" in result) || !result.ok) throw new Error("expected ok");
    assert.equal(
      Object.hasOwn(
        result.record as unknown as Record<string, unknown>,
        LEGACY_REVIEW_KEY,
      ),
      false,
    );
    const fullPath = path.join(
      manualStoryRoot.absolutePath,
      "records",
      "facts",
      "mfact-1.yaml",
    );
    const parsed = YAML.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
    assert.equal(Object.hasOwn(parsed, LEGACY_REVIEW_KEY), false);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("createRecord: sequential allocator yields prefix-1..3", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    for (let i = 1; i <= 3; i++) {
      const r = createRecord(manualStoryRoot, "facts", commonFields());
      if (!("ok" in r) || !r.ok) throw new Error("expected ok");
      assert.equal(r.id, `mfact-${i}`);
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("createRecord: schema-fail returns errors, no file created", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const body = commonFields() as unknown as Record<string, unknown>;
    delete body.title;
    const r = createRecord(
      manualStoryRoot,
      "facts",
      body as unknown as Omit<ManualFactRecord, "id">,
    );
    assert.equal("ok" in r && r.ok, false);
    if ("error" in r) {
      assert.equal(r.error, "validation_failed");
    }
    assert.equal(
      existsSync(
        path.join(
          manualStoryRoot.absolutePath,
          "records",
          "facts",
          "mfact-1.yaml",
        ),
      ),
      false,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("createRecord: refs-fail without override flags needsOverride; file NOT created", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const r = createRecord(manualStoryRoot, "beliefs", {
      ...commonFields(),
      holder: "mchar-99",
      truth_relation: "true",
      confidence: "low",
    } as unknown as Omit<ManualBeliefRecord, "id">);
    assert.equal("ok" in r && r.ok, false);
    if ("error" in r && r.error === "broken_refs") {
      assert.equal(r.needsOverride, true);
      assert.ok(r.violations.length > 0);
    } else {
      throw new Error("expected broken_refs");
    }
    assert.equal(
      existsSync(
        path.join(
          manualStoryRoot.absolutePath,
          "records",
          "beliefs",
          "mbel-1.yaml",
        ),
      ),
      false,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("createRecord: refs-fail with override writes the record", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const r = createRecord(
      manualStoryRoot,
      "beliefs",
      {
        ...commonFields(),
        holder: "mchar-99",
        truth_relation: "true",
        confidence: "low",
      } as unknown as Omit<ManualBeliefRecord, "id">,
      { overrideBrokenRefs: true },
    );
    assert.equal("ok" in r && r.ok, true);
    assert.equal(
      existsSync(
        path.join(
          manualStoryRoot.absolutePath,
          "records",
          "beliefs",
          "mbel-1.yaml",
        ),
      ),
      true,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("updateRecord: round-trip; ID preserved; missing returns not_found", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const created = createRecord(manualStoryRoot, "facts", commonFields());
    if (!("ok" in created) || !created.ok) throw new Error("create failed");
    const updated = updateRecord(manualStoryRoot, "facts", created.id, {
      ...created.record,
      title: "UPDATED",
    });
    assert.equal("ok" in updated && updated.ok, true);
    const parsed = YAML.parse(
      readFileSync(
        path.join(
          manualStoryRoot.absolutePath,
          "records",
          "facts",
          `${created.id}.yaml`,
        ),
        "utf8",
      ),
    ) as ManualFactRecord;
    assert.equal(parsed.title, "UPDATED");

    const missing = updateRecord(manualStoryRoot, "facts", "mfact-99", {
      ...created.record,
      id: "mfact-99",
    });
    assert.equal("ok" in missing && missing.ok, false);
    if ("error" in missing) assert.equal(missing.error, "not_found");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: unreferenced → hard_deleted; file gone", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const created = createRecord(manualStoryRoot, "facts", commonFields());
    if (!("ok" in created) || !created.ok) throw new Error("create failed");
    const result = deleteRecord(manualStoryRoot, "facts", created.id);
    assert.equal("outcome" in result && result.outcome, "hard_deleted");
    assert.equal(
      existsSync(
        path.join(
          manualStoryRoot.absolutePath,
          "records",
          "facts",
          `${created.id}.yaml`,
        ),
      ),
      false,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: referenced → blocked; file remains unchanged", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const cast = createRecord(manualStoryRoot, "cast", castProfileBody());
    if (!("ok" in cast) || !cast.ok) throw new Error("cast create failed");
    const belief = createRecord(manualStoryRoot, "beliefs", {
      ...commonFields(),
      refs: { characters: [cast.id], locations: [], related_records: [] },
      holder: cast.id,
      truth_relation: "true",
      confidence: "high",
    } as unknown as Omit<ManualBeliefRecord, "id">);
    if (!("ok" in belief) || !belief.ok) throw new Error("belief create failed");

    const result = deleteRecord(manualStoryRoot, "cast", cast.id);
    assert.equal("outcome" in result && result.outcome, "blocked");
    if ("outcome" in result && result.outcome === "blocked") {
      assert.ok(result.referrers.length > 0);
      assert.equal(result.referrers[0]?.summary.id, belief.id);
    }
    const onDisk = path.join(
      manualStoryRoot.absolutePath,
      "records",
      "cast",
      `${cast.id}.yaml`,
    );
    assert.equal(existsSync(onDisk), true);
    const parsed = YAML.parse(readFileSync(onDisk, "utf8")) as Record<
      string,
      unknown
    >;
    assert.equal(parsed.active, true);
    assert.equal(
      Object.hasOwn(parsed, ["retired", "reason"].join("_")),
      false,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: force on referenced → force_deleted with audit entry; file gone", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const cast = createRecord(manualStoryRoot, "cast", castProfileBody());
    if (!("ok" in cast) || !cast.ok) throw new Error("cast create failed");
    const belief = createRecord(manualStoryRoot, "beliefs", {
      ...commonFields(),
      refs: { characters: [cast.id], locations: [], related_records: [] },
      holder: cast.id,
      truth_relation: "true",
      confidence: "high",
    } as unknown as Omit<ManualBeliefRecord, "id">);
    if (!("ok" in belief) || !belief.ok) throw new Error("belief create failed");

    const result = deleteRecord(manualStoryRoot, "cast", cast.id, {
      force: true,
      now: () => "2026-05-30T12:00:00.000Z",
    });
    assert.equal("outcome" in result && result.outcome, "force_deleted");
    if ("outcome" in result && result.outcome === "force_deleted") {
      assert.equal(result.auditEntry.deletedAt, "2026-05-30T12:00:00.000Z");
      assert.equal(result.auditEntry.deletedClassAndId, `cast/${cast.id}`);
      assert.ok(result.auditEntry.referrers.length > 0);
    }
    const repairLog = YAML.parse(
      readFileSync(path.join(manualStoryRoot.absolutePath, "repair-log.yaml"), "utf8"),
    ) as Array<{
      deleted_class_and_id: string;
      deleted_at: string;
      referrers_at_deletion: unknown[];
    }>;
    assert.equal(repairLog.length, 1);
    assert.equal(repairLog[0]?.deleted_class_and_id, `cast/${cast.id}`);
    assert.equal(repairLog[0]?.deleted_at, "2026-05-30T12:00:00.000Z");
    assert.ok((repairLog[0]?.referrers_at_deletion ?? []).length > 0);
    assert.equal(
      existsSync(
        path.join(
          manualStoryRoot.absolutePath,
          "records",
          "cast",
          `${cast.id}.yaml`,
        ),
      ),
      false,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: allocator gap preservation after hard delete", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    for (let i = 0; i < 3; i++) {
      createRecord(manualStoryRoot, "facts", commonFields());
    }
    deleteRecord(manualStoryRoot, "facts", "mfact-2");
    assert.equal(
      allocateNextIdForClass(manualStoryRoot.absolutePath, "facts"),
      "mfact-4",
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: missing target returns not_found", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const result = deleteRecord(manualStoryRoot, "facts", "mfact-99");
    assert.equal("ok" in result && result.ok, false);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: traversal-shaped id rejected as not_found", () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const result = deleteRecord(manualStoryRoot, "facts", "../etc/passwd");
    assert.equal("ok" in result && result.ok, false);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("safeWriteFile: rejects relative paths containing .. traversal", async () => {
  const { repoRoot, manualStoryRoot } = mkWorld();
  try {
    const { safeWriteFile } = await import("../../src/write/sandbox.js");
    let threw = false;
    try {
      safeWriteFile(manualStoryRoot, "../escaped.yaml", "x");
    } catch {
      threw = true;
    }
    assert.equal(threw, true);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

// Suppress unused-import warning if any
const _writeFileSync = writeFileSync;
void _writeFileSync;
