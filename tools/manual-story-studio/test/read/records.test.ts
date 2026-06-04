import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import {
  listAllKnownIds,
  listRecords,
  readRecord,
  scanReferences,
} from "../../src/read/records.js";
import type { ReadResult } from "../../src/read/result.js";
import type {
  ManualBeliefRecord,
  ManualCharacterRecord,
  ManualFactRecord,
} from "../../src/schema/manual-story.js";

const LEGACY_REVIEW_KEY = ["last", "reviewed", "after", "segment"].join("_");

function mkRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "manual-studio-read-"));
  return root;
}

function commonFields(id: string): Pick<
  ManualFactRecord,
  | "id"
  | "title"
  | "active"
  | "importance"
  | "tags"
  | "summary"
  | "details"
  | "refs"
  | "prompt_visibility"
  | "notes"
> {
  return {
    id,
    title: `T-${id}`,
    active: true,
    importance: "medium",
    tags: ["a", "b"],
    summary: "s",
    details: "d",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    notes: "",
  };
}

function writeRecord(root: string, classDir: string, id: string, body: unknown): void {
  const dir = path.join(root, "records", classDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${id}.yaml`), YAML.stringify(body));
}

function unwrap<T>(result: ReadResult<T>): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected ok");
  return result.value;
}

function assertReadError(result: ReadResult<unknown>, code: string): void {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected read error");
  assert.equal(result.error.code, code);
}

test("listRecords: empty class returns []", () => {
  const root = mkRoot();
  try {
    assert.deepEqual(unwrap(listRecords(root, "beliefs")), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listRecords: populated class returns ordered summaries", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "beliefs", "mbel-2", {
      ...commonFields("mbel-2"),
      refs: { characters: ["mchar-2"], locations: [], related_records: [] },
      holder: "mchar-1",
      truth_relation: "true",
      confidence: "high",
    } satisfies ManualBeliefRecord);
    writeRecord(root, "beliefs", "mbel-1", {
      ...commonFields("mbel-1"),
      holder: "mchar-1",
      truth_relation: "true",
      confidence: "high",
    });
    writeRecord(root, "beliefs", "mbel-3", {
      ...commonFields("mbel-3"),
      holder: "mchar-1",
      truth_relation: "true",
      confidence: "high",
    });
    const summaries = unwrap(listRecords(root, "beliefs"));
    assert.equal(summaries.length, 3);
    assert.equal(summaries[0]?.id, "mbel-1");
    assert.equal(summaries[1]?.id, "mbel-2");
    assert.equal(summaries[2]?.id, "mbel-3");
    assert.equal(summaries[0]?.title, "T-mbel-1");
    assert.equal(summaries[0]?.importance, "medium");
    assert.deepEqual(summaries[0]?.involved_cast, []);
    assert.deepEqual(summaries[1]?.involved_cast, ["mchar-2"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listRecords: summaries use filename id over body id", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "cast", "mchar-1", castProfile(""));
    writeRecord(root, "cast", "mchar-2", castProfile("mchar-9"));

    const summaries = unwrap(listRecords(root, "cast"));

    assert.equal(summaries.length, 2);
    assert.equal(summaries[0]?.id, "mchar-1");
    assert.equal(summaries[1]?.id, "mchar-2");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listRecords: default omits inactive; includeInactive returns all", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "facts", "mfact-1", commonFields("mfact-1"));
    writeRecord(root, "facts", "mfact-2", {
      ...commonFields("mfact-2"),
      active: false,
    });
    assert.equal(unwrap(listRecords(root, "facts")).length, 1);
    assert.equal(unwrap(listRecords(root, "facts", { includeInactive: true })).length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readRecord: round-trip; missing and wrong-prefix return read errors", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "facts", "mfact-5", commonFields("mfact-5"));
    const r = unwrap(readRecord(root, "facts", "mfact-5"));
    assert.equal(r.id, "mfact-5");

    assertReadError(readRecord(root, "facts", "mfact-99"), "file_not_found");
    // wrong prefix: validator should reject without disk read
    assertReadError(readRecord(root, "facts", "mbel-5"), "invalid_id_shape");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readRecord: empty body id normalizes to filename id", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "cast", "mchar-1", castProfile(""));

    const record = unwrap(readRecord(root, "cast", "mchar-1"));

    assert.equal(record.id, "mchar-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readRecord: non-empty body id mismatch is a read error", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "cast", "mchar-1", castProfile("mchar-9"));

    assertReadError(readRecord(root, "cast", "mchar-1"), "id_filename_mismatch");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readRecord: strips legacy reviewed segment marker", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "facts", "mfact-5", {
      ...commonFields("mfact-5"),
      [LEGACY_REVIEW_KEY]: "SEG-7",
    });

    const record = unwrap(readRecord(root, "facts", "mfact-5"));

    assert.equal(
      Object.hasOwn(record as unknown as Record<string, unknown>, LEGACY_REVIEW_KEY),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listAllKnownIds: assembles per-class IDs including archived", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "cast", "mchar-1", castProfile("mchar-1"));
    writeRecord(root, "cast", "mchar-2", { ...castProfile("mchar-2"), active: false });
    writeRecord(root, "facts", "mfact-1", commonFields("mfact-1"));
    const known = unwrap(listAllKnownIds(root));
    assert.deepEqual([...known.cast].sort(), ["mchar-1", "mchar-2"]);
    assert.deepEqual([...known.facts], ["mfact-1"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listAllKnownIds: pulls segments from manual-story.yaml's segment_order", () => {
  const root = mkRoot();
  try {
    writeFileSync(
      path.join(root, "manual-story.yaml"),
      YAML.stringify({ segment_order: ["SEG-1", "SEG-2"] }),
    );
    const known = unwrap(listAllKnownIds(root));
    assert.deepEqual([...known.segments].sort(), ["SEG-1", "SEG-2"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scanReferences: finds refs.characters / per-class pointer / refs.related_records", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "cast", "mchar-1", castProfile("mchar-1"));
    writeRecord(root, "beliefs", "mbel-1", {
      ...commonFields("mbel-1"),
      refs: { characters: ["mchar-1"], locations: [], related_records: [] },
      holder: "mchar-1",
      truth_relation: "true",
      confidence: "high",
    } satisfies ManualBeliefRecord);
    writeRecord(root, "facts", "mfact-1", {
      ...commonFields("mfact-1"),
      refs: {
        characters: [],
        locations: [],
        related_records: ["mbel-1"],
      },
    });

    const targetReferrers = unwrap(scanReferences(root, "mchar-1"));
    // mbel-1 references mchar-1 in TWO places: refs.characters[0] AND holder
    assert.equal(targetReferrers.length, 2);
    const fields = targetReferrers.map((r) => r.field).sort();
    assert.deepEqual(fields, ["holder", "refs.characters[0]"]);

    const belReferrers = unwrap(scanReferences(root, "mbel-1"));
    assert.equal(belReferrers.length, 1);
    assert.equal(belReferrers[0]?.field, "refs.related_records[0]");
    assert.equal(belReferrers[0]?.recordClass, "facts");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listRecords fails fast on corrupt YAML", () => {
  const root = mkRoot();
  try {
    const dir = path.join(root, "records", "facts");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "mfact-1.yaml"), "title: [unterminated\n");

    assertReadError(listRecords(root, "facts"), "yaml_parse_failed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scanReferences fails fast on corrupt iterated records", () => {
  const root = mkRoot();
  try {
    writeRecord(root, "facts", "mfact-1", commonFields("mfact-1"));
    const dir = path.join(root, "records", "beliefs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "mbel-1.yaml"), "title: [unterminated\n");

    assertReadError(scanReferences(root, "mchar-1"), "yaml_parse_failed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function castProfile(id: string): ManualCharacterRecord {
  return {
    ...commonFields(id),
    display_name: id,
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
