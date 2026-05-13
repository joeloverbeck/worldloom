import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import type { ChangeLogEntry } from "@worldloom/world-index/public/types";
import { stageRepairSkippedChangeLogEntry } from "../../src/ops/repair-skipped-change-log-entry.js";
import { assertOpError, assertYamlEquals, baseEnvelope, changeLog, createTestWorld } from "../harness.js";
import { contentHashForYaml, serializeStableYaml } from "../../src/ops/shared.js";

function writeSkippedChangeLog(worldRoot: string, worldSlug: string, record: Record<string, unknown>): string {
  const target = path.join(worldRoot, "worlds", worldSlug, "_source/change-log/CH-0006.yaml");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, serializeStableYaml(record), "utf8");
  return target;
}

test("repair_skipped_change_log_entry stages a replacement CH record by target file", async (t) => {
  const world = createTestWorld(t);
  const malformed = {
    id: "CH-0006",
    date: "2026-05-04",
    title: "Manual correction",
    notes: "Historical manual correction."
  };
  writeSkippedChangeLog(world.worldRoot, world.worldSlug, malformed);
  const env = baseEnvelope();
  const repaired: ChangeLogEntry = {
    ...changeLog("CH-0006"),
    change_type: "clarification",
    affected_fact_ids: ["CF-0006"],
    summary: "Manual correction represented in the canonical change-log schema."
  };

  const staged = await stageRepairSkippedChangeLogEntry(
    env,
    {
      op: "repair_skipped_change_log_entry",
      target_world: env.target_world,
      target_file: "_source/change-log/CH-0006.yaml",
      expected_content_hash: contentHashForYaml(malformed),
      payload: {
        target_ch_id: "CH-0006",
        repaired_record: repaired,
        repair_reason: "Schema-maintenance repair for a skipped change-log entry."
      }
    } satisfies Extract<PatchOperation, { op: "repair_skipped_change_log_entry" }>,
    world.ctx
  );

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "_source/change-log/CH-0006.yaml"));
  assertYamlEquals(staged, repaired);
});

test("repair_skipped_change_log_entry rejects mismatched ids, paths, and hash drift", async (t) => {
  const world = createTestWorld(t);
  const malformed = { id: "CH-0006", date: "2026-05-04", notes: "Historical manual correction." };
  writeSkippedChangeLog(world.worldRoot, world.worldSlug, malformed);
  const env = baseEnvelope();
  const baseOp = {
    op: "repair_skipped_change_log_entry",
    target_world: env.target_world,
    target_file: "_source/change-log/CH-0006.yaml",
    expected_content_hash: contentHashForYaml(malformed),
    payload: {
      target_ch_id: "CH-0006",
      repaired_record: changeLog("CH-0006"),
      repair_reason: "Schema-maintenance repair for a skipped change-log entry."
    }
  } satisfies Extract<PatchOperation, { op: "repair_skipped_change_log_entry" }>;

  await assertOpError(
    () =>
      stageRepairSkippedChangeLogEntry(
        env,
        {
          ...baseOp,
          target_file: "_source/canon/CH-0006.yaml"
        },
        world.ctx
      ),
    "target_file_outside_world"
  );

  await assertOpError(
    () =>
      stageRepairSkippedChangeLogEntry(
        env,
        {
          ...baseOp,
          payload: {
            ...baseOp.payload,
            repaired_record: changeLog("CH-0007")
          }
        },
        world.ctx
      ),
    "invalid_record_id"
  );

  await assertOpError(
    () =>
      stageRepairSkippedChangeLogEntry(
        env,
        {
          ...baseOp,
          expected_content_hash: "not-the-current-hash"
        },
        world.ctx
      ),
    "record_hash_drift"
  );
});
