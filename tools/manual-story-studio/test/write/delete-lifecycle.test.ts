import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import type {
  ManualBeliefRecord,
  ManualCharacterRecord,
  ManualFactRecord,
} from "../../src/schema/manual-story.js";
import {
  createRecord,
  deleteRecord,
} from "../../src/write/records.js";
import { resolveManualStoryRoot } from "../../src/write/sandbox.js";

function mkWorld(): { repoRoot: string; root: ReturnType<typeof resolveManualStoryRoot> } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "manual-studio-delete-lifecycle-"));
  const worldSlug = "test-world";
  const manualStorySlug = "test-story";
  mkdirSync(
    path.join(repoRoot, "worlds", worldSlug, "manual-stories", manualStorySlug),
    { recursive: true },
  );
  return {
    repoRoot,
    root: resolveManualStoryRoot(repoRoot, worldSlug, manualStorySlug),
  };
}

function commonFields(): Omit<ManualFactRecord, "id"> {
  return {
    title: "T",
    active: true,
    importance: "medium",
    tags: [],
    summary: "summary",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    last_reviewed_after_segment: null,
    notes: "",
  };
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
  };
}

function createReferencedCast(
  root: ReturnType<typeof resolveManualStoryRoot>,
): { castId: string; beliefId: string; castPath: string } {
  const cast = createRecord(root, "cast", castProfileBody());
  if (!("ok" in cast) || !cast.ok) throw new Error("cast create failed");
  const belief = createRecord(root, "beliefs", {
    ...commonFields(),
    title: `Belief for ${cast.id}`,
    summary: `Summary for ${cast.id}`,
    refs: { characters: [cast.id], locations: [], related_records: [] },
    holder: cast.id,
    truth_relation: "true",
    confidence: "high",
  } as unknown as Omit<ManualBeliefRecord, "id">);
  if (!("ok" in belief) || !belief.ok) throw new Error("belief create failed");
  return {
    castId: cast.id,
    beliefId: belief.id,
    castPath: path.join(root.absolutePath, "records", "cast", `${cast.id}.yaml`),
  };
}

test("deleteRecord: unreferenced record hard-deletes the file", () => {
  const { repoRoot, root } = mkWorld();
  try {
    const fact = createRecord(root, "facts", commonFields());
    if (!("ok" in fact) || !fact.ok) throw new Error("fact create failed");
    const factPath = path.join(root.absolutePath, "records", "facts", `${fact.id}.yaml`);

    const result = deleteRecord(root, "facts", fact.id);

    assert.equal("outcome" in result && result.outcome, "hard_deleted");
    assert.equal(existsSync(factPath), false);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: referenced record blocks with summaries and does not flip active", () => {
  const { repoRoot, root } = mkWorld();
  try {
    const { castId, beliefId, castPath } = createReferencedCast(root);

    const result = deleteRecord(root, "cast", castId);

    assert.equal("outcome" in result && result.outcome, "blocked");
    if ("outcome" in result && result.outcome === "blocked") {
      assert.equal(result.referrers.length, 1);
      assert.equal(result.referrers[0]?.recordClass, "beliefs");
      assert.equal(result.referrers[0]?.summary.id, beliefId);
      assert.equal(result.referrers[0]?.summary.title, `Belief for ${castId}`);
      assert.equal(result.referrers[0]?.summary.summary, `Summary for ${castId}`);
    }
    const onDisk = YAML.parse(readFileSync(castPath, "utf8")) as Record<string, unknown>;
    assert.equal(onDisk.active, true);
    assert.equal(onDisk.retired_reason, undefined);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("deleteRecord: repair-mode force-delete appends persisted repair-log entries", () => {
  const { repoRoot, root } = mkWorld();
  try {
    const first = createReferencedCast(root);
    const second = createReferencedCast(root);

    const firstResult = deleteRecord(root, "cast", first.castId, {
      force: true,
      now: () => "2026-06-02T10:00:00.000Z",
    });
    const secondResult = deleteRecord(root, "cast", second.castId, {
      force: true,
      now: () => "2026-06-02T11:00:00.000Z",
    });

    assert.equal("outcome" in firstResult && firstResult.outcome, "force_deleted");
    assert.equal("outcome" in secondResult && secondResult.outcome, "force_deleted");
    assert.equal(existsSync(first.castPath), false);
    assert.equal(existsSync(second.castPath), false);

    const repairLog = YAML.parse(
      readFileSync(path.join(root.absolutePath, "repair-log.yaml"), "utf8"),
    ) as Array<{
      deleted_class_and_id: string;
      deleted_at: string;
      referrers_at_deletion: Array<{ id: string }>;
    }>;
    assert.deepEqual(
      repairLog.map((entry) => entry.deleted_class_and_id),
      [`cast/${first.castId}`, `cast/${second.castId}`],
    );
    assert.deepEqual(
      repairLog.map((entry) => entry.deleted_at),
      ["2026-06-02T10:00:00.000Z", "2026-06-02T11:00:00.000Z"],
    );
    assert.equal(repairLog[0]?.referrers_at_deletion[0]?.id, first.beliefId);
    assert.equal(repairLog[1]?.referrers_at_deletion[0]?.id, second.beliefId);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
