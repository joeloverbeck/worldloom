import assert from "node:assert/strict";
import test from "node:test";

import { checkIdAllocationRace } from "../../src/pre-apply-checks/id-allocation-race.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import {
  baseEnvelope,
  changeLog,
  createIndexedTestWorld,
  createOp,
  section,
  seedRecord
} from "../harness.js";

test("checkIdAllocationRace passes matching world and story-bundle allocations", (t) => {
  const world = createIndexedTestWorld(t);
  seedStoryRecord(world, "red-bunny", "OBL-0012");
  const patches = [
    createOp({
      op: "create_ch_record",
      target_world: world.worldSlug,
      payload: { ch_record: changeLog("CH-0001") }
    } satisfies Extract<PatchOperation, { op: "create_ch_record" }>),
    createOp({
      op: "create_sec_record",
      target_world: world.worldSlug,
      payload: { sec_record: { ...section("SEC-GEO-001"), id: "SEC-GEO-001", file_class: "GEOGRAPHY" } }
    } satisfies Extract<PatchOperation, { op: "create_sec_record" }>),
    createObligationPatch(world.worldSlug, "red-bunny", "OBL-0013")
  ];
  const envelope = {
    ...baseEnvelope({
      cf_ids: ["CF-0002"],
      ch_ids: ["CH-0001"],
      inv_ids: ["ONT-2", "CAU-1"],
      sec_ids: ["SEC-GEO-001"],
      obl_ids: ["OBL-0013"]
    }),
    target_world: world.worldSlug,
    patches
  };

  assert.deepEqual(checkIdAllocationRace(world.db, envelope), { ok: true, failures: [] });
});

test("checkIdAllocationRace reports a story-bundle off-by-one with the submit-time message format", (t) => {
  const world = createIndexedTestWorld(t);
  seedStoryRecord(world, "red-bunny", "OBL-0012");
  const envelope = {
    ...baseEnvelope({ obl_ids: ["OBL-0014"] }),
    target_world: world.worldSlug,
    patches: [createObligationPatch(world.worldSlug, "red-bunny", "OBL-0014")]
  };

  const result = checkIdAllocationRace(world.db, envelope);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "id_allocation_race");
    assert.equal(
      result.message,
      "obl_ids allocation race for story 'red-bunny': expected OBL-0014, current next id is OBL-0013."
    );
    assert.deepEqual(result.failures, [
      {
        key: "obl_ids",
        expected: "OBL-0014",
        current: "OBL-0013",
        story_slug: "red-bunny",
        message: "obl_ids allocation race for story 'red-bunny': expected OBL-0014, current next id is OBL-0013."
      }
    ]);
  }
});

test("checkIdAllocationRace returns every mismatch while preserving the first message", (t) => {
  const world = createIndexedTestWorld(t);
  seedStoryRecord(world, "red-bunny", "OBL-0012");
  const envelope = {
    ...baseEnvelope({ cf_ids: ["CF-0003"], inv_ids: ["ONT-4"], obl_ids: ["OBL-0014"] }),
    target_world: world.worldSlug,
    patches: [createObligationPatch(world.worldSlug, "red-bunny", "OBL-0014")]
  };

  const result = checkIdAllocationRace(world.db, envelope);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, "cf_ids allocation race: expected CF-0003, current next id is CF-0002.");
    assert.deepEqual(
      result.failures.map((failure) => failure.key),
      ["cf_ids", "inv_ids", "obl_ids"]
    );
    assert.ok(
      result.failures.some(
        (failure) =>
          failure.message ===
          "obl_ids allocation race for story 'red-bunny': expected OBL-0014, current next id is OBL-0013."
      )
    );
  }
});

function createObligationPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_obl_record" }> {
  return createOp({
    op: "create_obl_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/obligations/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        title: `Obligation ${id}`,
        status: "active"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_obl_record" }>);
}

function seedStoryRecord(
  world: ReturnType<typeof createIndexedTestWorld>,
  storySlug: string,
  id: string
): void {
  seedRecord(world, `${storySlug}:${id}`, "obligation_record", `stories/${storySlug}/_source/obligations/${id}.yaml`, {
    id,
    title: `Existing obligation ${id}`
  });
  world.db
    .prepare("UPDATE nodes SET story_slug = ?, node_id = ? WHERE node_id = ?")
    .run(storySlug, id, `${storySlug}:${id}`);
}
