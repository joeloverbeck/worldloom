import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { replayActiveRecords } from "@worldloom/validators";

import {
  computePgSnapshot,
  runComputePgSnapshotCli
} from "../../src/cli/compute-pg-snapshot.js";

// ---------------------------------------------------------------------------
// Regression fixture: the committed red-bunny PG-5 turn. PG-4's active_records,
// SE-5's state_delta, and the expected PG-5 active_records are the real
// committed values (worlds/erotica-world/stories/red-bunny/_source). Holding
// them inline keeps the unit test hermetic — it never reads the mutable live
// world — while still proving a real-turn regression.
// ---------------------------------------------------------------------------

const PG4_ACTIVE_RECORDS: Record<string, string[]> = {
  BEL: ["BEL-1", "BEL-2", "BEL-3", "BEL-4", "BEL-5", "BEL-6", "BEL-7", "BEL-10", "BEL-11"],
  CLK: ["CLK-2"],
  CNSQ: [],
  DA: [],
  OBL: ["OBL-1"],
  SF: ["SF-1", "SF-2", "SF-3", "SF-4", "SF-5", "SF-6", "SF-7"],
  SREL: ["SREL-1", "SREL-2", "SREL-3", "SREL-6"],
  STCHAR: ["STCHAR-1", "STCHAR-2", "STCHAR-3"],
  STEMO: ["STEMO-1", "STEMO-6", "STEMO-7", "STEMO-8"],
  STENT: ["STENT-1", "STENT-2", "STENT-3"],
  STINT: ["STINT-2", "STINT-3", "STINT-4"],
  STLOC: ["STLOC-1"],
  STOBJ: ["STOBJ-1"],
  STPLAN: [],
  STQ: [],
  STSEC: ["STSEC-1"],
  STSTAT: ["STSTAT-1", "STSTAT-2", "STSTAT-3"],
  THR: ["THR-1", "THR-2", "THR-3"]
};

// PG-5 committed active_records (the value the CLI must reproduce).
const PG5_EXPECTED_ACTIVE_RECORDS: Record<string, string[]> = {
  ...PG4_ACTIVE_RECORDS,
  BEL: ["BEL-1", "BEL-2", "BEL-3", "BEL-4", "BEL-5", "BEL-6", "BEL-7", "BEL-12", "BEL-13"],
  SF: ["SF-1", "SF-2", "SF-3", "SF-4", "SF-5", "SF-6", "SF-7", "SF-8"],
  STEMO: ["STEMO-1", "STEMO-6", "STEMO-7", "STEMO-9"]
};

function pg5Envelope() {
  return {
    plan_id: "tcsnap-regression-pg5",
    target_world: "erotica-world",
    approval_token: "x",
    verdict: "accept",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_se_record",
        target_world: "erotica-world",
        payload: {
          story_slug: "red-bunny",
          record: {
            id: "SE-5",
            record_kind: "story_event_record",
            state_delta: {
              create: ["SF-8", "BEL-12", "BEL-13", "STEMO-9"],
              supersede: ["BEL-11", "BEL-10", "STEMO-8"],
              close: []
            }
          }
        }
      },
      { op: "create_sf_record", target_world: "erotica-world", payload: { story_slug: "red-bunny", record: { id: "SF-8" } } },
      { op: "create_bel_record", target_world: "erotica-world", payload: { story_slug: "red-bunny", record: { id: "BEL-12", status: "active" } } },
      { op: "create_bel_record", target_world: "erotica-world", payload: { story_slug: "red-bunny", record: { id: "BEL-13", status: "active" } } },
      { op: "create_stemo_record", target_world: "erotica-world", payload: { story_slug: "red-bunny", record: { id: "STEMO-9", status: "active" } } },
      {
        op: "create_pg_record",
        target_world: "erotica-world",
        payload: {
          story_slug: "red-bunny",
          record: {
            id: "PG-5",
            parent_page_id: "PG-4",
            input: { choice_id: null, manual_action_text: null, resolved_event_id: "SE-5" }
          }
        }
      }
    ]
  };
}

function makeWorldRoot(parentPageId: string, parentActiveRecords: Record<string, string[]>): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-compute-pg-snapshot-"));
  mkdirSync(path.join(root, "docs"), { recursive: true });
  const pagesDir = path.join(root, "worlds", "erotica-world", "stories", "red-bunny", "_source", "pages");
  mkdirSync(pagesDir, { recursive: true });
  writeFileSync(path.join(root, "docs", "FOUNDATIONS.md"), "# Foundations\n", "utf8");
  const parentRecord = {
    id: parentPageId,
    state_snapshot: { active_records: parentActiveRecords }
  };
  writeFileSync(
    path.join(pagesDir, `${parentPageId}.yaml`),
    `${JSON.stringify(parentRecord, null, 2)}\n`,
    "utf8"
  );
  return root;
}

function writeEnvelope(dir: string, envelope: unknown): string {
  const filePath = path.join(dir, "envelope.json");
  writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  return filePath;
}

function sortActive(active: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(active).sort()) {
    out[key] = [...active[key]!].sort();
  }
  return out;
}

test("cli-compute-pg-snapshot: --help prints usage to stdout and exits 0", async () => {
  const result = await runComputePgSnapshotCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Usage: compute-pg-snapshot/);
  assert.equal(result.stderr, "");
});

test("cli-compute-pg-snapshot: missing plan path exits 2 with usage", async () => {
  const result = await runComputePgSnapshotCli([]);

  assert.equal(result.exitCode, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /<plan-path> is required/);
  assert.match(result.stderr, /Usage: compute-pg-snapshot/);
});

test("cli-compute-pg-snapshot: missing plan file exits 1", async () => {
  const result = await runComputePgSnapshotCli(["/tmp/worldloom-missing-plan-xyz.json"]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Failed to read plan file/);
});

test("cli-compute-pg-snapshot: malformed JSON plan exits 1", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-snapshot-bad-"));
  try {
    const planPath = path.join(dir, "plan.json");
    writeFileSync(planPath, '{"patches": ', "utf8");

    const result = await runComputePgSnapshotCli([planPath]);

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /not valid JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: invalid --world-root exits 2 without computing", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-snapshot-noroot-"));
  try {
    const planPath = writeEnvelope(dir, pg5Envelope());

    const result = await runComputePgSnapshotCli(["--world-root", dir, planPath]);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /not a valid worldloom project root/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: reproduces the committed red-bunny PG-5 active_records", async () => {
  const root = makeWorldRoot("PG-4", PG4_ACTIVE_RECORDS);
  const dir = mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-snapshot-pg5-"));
  try {
    const planPath = writeEnvelope(dir, pg5Envelope());

    const result = await runComputePgSnapshotCli(["--world-root", root, planPath]);

    assert.equal(result.exitCode, 0, result.stderr);
    const output = JSON.parse(result.stdout) as { active_records: Record<string, string[]> };
    // Equality against the committed PG-5 snapshot — which already passes
    // snapshot_replay_equality on disk — proves the CLI emits exactly what the
    // validator will accept for this parent + state_delta (Acceptance #1).
    assert.deepEqual(sortActive(output.active_records), sortActive(PG5_EXPECTED_ACTIVE_RECORDS));
    assert.match(result.stderr, /\[world-root\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: output equals replayActiveRecords invoked directly (single source of truth)", () => {
  const recordsById = new Map<string, Record<string, unknown>>([
    ["SF-8", { id: "SF-8" }],
    ["BEL-12", { id: "BEL-12", status: "active" }],
    ["BEL-13", { id: "BEL-13", status: "active" }],
    ["STEMO-9", { id: "STEMO-9", status: "active" }]
  ]);
  const delta = {
    create: ["SF-8", "BEL-12", "BEL-13", "STEMO-9"],
    supersede: ["BEL-11", "BEL-10", "STEMO-8"],
    close: []
  };

  const root = makeWorldRoot("PG-4", PG4_ACTIVE_RECORDS);
  const dir = mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-snapshot-helper-"));
  try {
    const outcome = computePgSnapshot(pg5Envelope(), root);
    assert.ok(outcome.ok, outcome.ok ? "" : outcome.message);

    const direct = replayActiveRecords(
      PG4_ACTIVE_RECORDS as Record<string, readonly string[]>,
      delta,
      recordsById
    );
    // Byte-for-byte: the CLI is a thin wrapper that does not re-sort or
    // re-shape the helper output.
    assert.deepEqual(outcome.activeRecords, direct);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: omits a created-but-inactive successor (CLK status resolved)", () => {
  const parentActive: Record<string, string[]> = { CLK: ["CLK-1"], STEMO: ["STEMO-1"] };
  const root = makeWorldRoot("PG-1", parentActive);
  try {
    const envelope = {
      target_world: "erotica-world",
      patches: [
        {
          op: "create_se_record",
          target_world: "erotica-world",
          payload: {
            story_slug: "red-bunny",
            record: {
              id: "SE-2",
              state_delta: { create: ["CLK-2", "STEMO-2"], supersede: [], close: [] }
            }
          }
        },
        // CLK-2 is created with an inactive lifecycle status: it exists, but must
        // be omitted from active_records.CLK.
        { op: "create_clk_record", target_world: "erotica-world", payload: { story_slug: "red-bunny", record: { id: "CLK-2", status: "resolved" } } },
        // STEMO-2 is created active: it must appear.
        { op: "create_stemo_record", target_world: "erotica-world", payload: { story_slug: "red-bunny", record: { id: "STEMO-2", status: "active" } } },
        {
          op: "create_pg_record",
          target_world: "erotica-world",
          payload: {
            story_slug: "red-bunny",
            record: { id: "PG-2", parent_page_id: "PG-1", input: { resolved_event_id: "SE-2" } }
          }
        }
      ]
    };

    const outcome = computePgSnapshot(envelope, root);
    assert.ok(outcome.ok, outcome.ok ? "" : outcome.message);
    assert.deepEqual(outcome.activeRecords.CLK, ["CLK-1"]);
    assert.deepEqual(outcome.activeRecords.STEMO, ["STEMO-1", "STEMO-2"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: errors when the envelope has no create_pg_record", () => {
  const root = makeWorldRoot("PG-1", { CLK: ["CLK-1"] });
  try {
    const outcome = computePgSnapshot({ target_world: "erotica-world", patches: [] }, root);
    assert.equal(outcome.ok, false);
    assert.match(outcome.ok ? "" : outcome.message, /no create_pg_record patch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: errors on multiple create_pg_record patches", () => {
  const root = makeWorldRoot("PG-1", { CLK: ["CLK-1"] });
  try {
    const pgPatch = {
      op: "create_pg_record",
      target_world: "erotica-world",
      payload: { story_slug: "red-bunny", record: { id: "PG-2", parent_page_id: "PG-1", input: { resolved_event_id: "SE-2" } } }
    };
    const outcome = computePgSnapshot({ target_world: "erotica-world", patches: [pgPatch, pgPatch] }, root);
    assert.equal(outcome.ok, false);
    assert.match(outcome.ok ? "" : outcome.message, /2 create_pg_record patches; expected exactly one/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: errors when the resolved event is absent from the envelope", () => {
  const root = makeWorldRoot("PG-1", { CLK: ["CLK-1"] });
  try {
    const outcome = computePgSnapshot(
      {
        target_world: "erotica-world",
        patches: [
          {
            op: "create_pg_record",
            target_world: "erotica-world",
            payload: { story_slug: "red-bunny", record: { id: "PG-2", parent_page_id: "PG-1", input: { resolved_event_id: "SE-99" } } }
          }
        ]
      },
      root
    );
    assert.equal(outcome.ok, false);
    assert.match(outcome.ok ? "" : outcome.message, /SE-99 has no matching create patch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cli-compute-pg-snapshot: errors when the parent page file is missing on disk", () => {
  const root = makeWorldRoot("PG-1", { CLK: ["CLK-1"] });
  try {
    const outcome = computePgSnapshot(
      {
        target_world: "erotica-world",
        patches: [
          {
            op: "create_se_record",
            target_world: "erotica-world",
            payload: { story_slug: "red-bunny", record: { id: "SE-2", state_delta: { create: [], supersede: [], close: [] } } }
          },
          {
            op: "create_pg_record",
            target_world: "erotica-world",
            // parent_page_id PG-7 was never written to disk.
            payload: { story_slug: "red-bunny", record: { id: "PG-2", parent_page_id: "PG-7", input: { resolved_event_id: "SE-2" } } }
          }
        ]
      },
      root
    );
    assert.equal(outcome.ok, false);
    assert.match(outcome.ok ? "" : outcome.message, /Failed to read parent page PG-7/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
