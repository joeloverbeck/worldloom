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
  seedStoryRecord(world, "red-bunny", "OBL-12");
  const patches = [
    createOp({
      op: "create_ch_record",
      target_world: world.worldSlug,
      payload: { ch_record: changeLog("CH-1") }
    } satisfies Extract<PatchOperation, { op: "create_ch_record" }>),
    createOp({
      op: "create_sec_record",
      target_world: world.worldSlug,
      payload: { sec_record: { ...section("SEC-GEO-1"), id: "SEC-GEO-1", file_class: "GEOGRAPHY" } }
    } satisfies Extract<PatchOperation, { op: "create_sec_record" }>),
    createObligationPatch(world.worldSlug, "red-bunny", "OBL-13")
  ];
  const envelope = {
    ...baseEnvelope({
      cf_ids: ["CF-2"],
      ch_ids: ["CH-1"],
      inv_ids: ["ONT-2", "CAU-1"],
      sec_ids: ["SEC-GEO-1"],
      obl_ids: ["OBL-13"]
    }),
    target_world: world.worldSlug,
    patches
  };

  assert.deepEqual(checkIdAllocationRace(world.db, envelope), { ok: true, failures: [] });
});

test("checkIdAllocationRace reports a story-bundle off-by-one with the submit-time message format", (t) => {
  const world = createIndexedTestWorld(t);
  seedStoryRecord(world, "red-bunny", "OBL-12");
  const envelope = {
    ...baseEnvelope({ obl_ids: ["OBL-14"] }),
    target_world: world.worldSlug,
    patches: [createObligationPatch(world.worldSlug, "red-bunny", "OBL-14")]
  };

  const result = checkIdAllocationRace(world.db, envelope);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "id_allocation_race");
    assert.equal(
      result.message,
      "obl_ids allocation race for story 'red-bunny': expected OBL-14, current next id is OBL-13."
    );
    assert.deepEqual(result.failures, [
      {
        key: "obl_ids",
        expected: "OBL-14",
        current: "OBL-13",
        story_slug: "red-bunny",
        message: "obl_ids allocation race for story 'red-bunny': expected OBL-14, current next id is OBL-13."
      }
    ]);
  }
});

test("checkIdAllocationRace rejects duplicate BEL allocations in one story-bundle plan", (t) => {
  const world = createIndexedTestWorld(t);
  const envelope = {
    ...baseEnvelope({ bel_ids: ["BEL-1", "BEL-1"] }),
    target_world: world.worldSlug,
    patches: [
      createBelPatch(world.worldSlug, "red-bunny", "BEL-1"),
      createBelPatch(world.worldSlug, "red-bunny", "BEL-1")
    ]
  };

  const result = checkIdAllocationRace(world.db, envelope);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "id_allocation_race");
    assert.deepEqual(result.failures, [
      {
        key: "bel_ids",
        expected: "BEL-1",
        current: "BEL-2",
        story_slug: "red-bunny",
        message:
          "bel_ids allocation race for story 'red-bunny': expected BEL-1, current next id is BEL-2."
      }
    ]);
  }
});

test("checkIdAllocationRace accepts STCHAR allocations for story-character authority ops", (t) => {
  const world = createIndexedTestWorld(t);
  seedStcharRecord(world, "red-bunny", "STCHAR-1");
  const envelope = {
    ...baseEnvelope({ stchar_ids: ["STCHAR-2"] }),
    target_world: world.worldSlug,
    patches: [createStcharPatch(world.worldSlug, "red-bunny", "STCHAR-2")]
  };

  assert.deepEqual(checkIdAllocationRace(world.db, envelope), { ok: true, failures: [] });
});

test("checkIdAllocationRace accepts SCN allocations for story-scene ops", (t) => {
  const world = createIndexedTestWorld(t);
  seedScnRecord(world, "red-bunny", "SCN-1");
  const envelope = {
    ...baseEnvelope({ scn_ids: ["SCN-2"] }),
    target_world: world.worldSlug,
    patches: [createScnPatch(world.worldSlug, "red-bunny", "SCN-2")]
  };

  assert.deepEqual(checkIdAllocationRace(world.db, envelope), { ok: true, failures: [] });
});

test("checkIdAllocationRace reports SCN story-bundle allocation races", (t) => {
  const world = createIndexedTestWorld(t);
  seedScnRecord(world, "red-bunny", "SCN-1");
  const envelope = {
    ...baseEnvelope({ scn_ids: ["SCN-3"] }),
    target_world: world.worldSlug,
    patches: [createScnPatch(world.worldSlug, "red-bunny", "SCN-3")]
  };

  const result = checkIdAllocationRace(world.db, envelope);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "id_allocation_race");
    assert.equal(
      result.message,
      "scn_ids allocation race for story 'red-bunny': expected SCN-3, current next id is SCN-2."
    );
    assert.deepEqual(result.failures, [
      {
        key: "scn_ids",
        expected: "SCN-3",
        current: "SCN-2",
        story_slug: "red-bunny",
        message: "scn_ids allocation race for story 'red-bunny': expected SCN-3, current next id is SCN-2."
      }
    ]);
  }
});

test("checkIdAllocationRace returns every mismatch while preserving the first message", (t) => {
  const world = createIndexedTestWorld(t);
  seedStoryRecord(world, "red-bunny", "OBL-12");
  const envelope = {
    ...baseEnvelope({ cf_ids: ["CF-3"], inv_ids: ["ONT-4"], obl_ids: ["OBL-14"] }),
    target_world: world.worldSlug,
    patches: [createObligationPatch(world.worldSlug, "red-bunny", "OBL-14")]
  };

  const result = checkIdAllocationRace(world.db, envelope);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, "cf_ids allocation race: expected CF-3, current next id is CF-2.");
    assert.deepEqual(
      result.failures.map((failure) => failure.key),
      ["cf_ids", "inv_ids", "obl_ids"]
    );
    assert.ok(
      result.failures.some(
        (failure) =>
          failure.message ===
          "obl_ids allocation race for story 'red-bunny': expected OBL-14, current next id is OBL-13."
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

function createBelPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_bel_record" }> {
  return createOp({
    op: "create_bel_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/beliefs/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        holder: "STENT-0001",
        claim: `Belief ${id}`
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_bel_record" }>);
}

function createStcharPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "append_story_character_authority_record" }> {
  return createOp({
    op: "append_story_character_authority_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/story-characters/${id}.md`,
    payload: {
      story_slug: storySlug,
      record: { id },
      body_markdown: "## Profile\n\nA profile."
    }
  } satisfies Extract<PatchOperation, { op: "append_story_character_authority_record" }>);
}

function createScnPatch(
  worldSlug: string,
  storySlug: string,
  id: string
): Extract<PatchOperation, { op: "create_scn_record" }> {
  return createOp({
    op: "create_scn_record",
    target_world: worldSlug,
    target_file: `stories/${storySlug}/_source/scenes/${id}.yaml`,
    payload: {
      story_slug: storySlug,
      record: {
        id,
        story_id: "STORY-1",
        branch_id: "BR-1",
        supersedes: null,
        status: "planned",
        pg_ids: ["PG-1"],
        start_page_id: "PG-1",
        end_page_id: "PG-1",
        previous_scene_id: null,
        choice_surface_page_id: "PG-1",
        emitted_choice_ids: ["CHC-1"],
        title: "Bench Conversation",
        slug: "bench-conversation",
        prose_plan_path: `scene-prose-plans/${id}.md`,
        prose_path: `scene-prose/${id}.md`,
        receipt_path: `scene-prose-receipts/${id}.yaml`
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_scn_record" }>);
}

function seedStcharRecord(
  world: ReturnType<typeof createIndexedTestWorld>,
  storySlug: string,
  id: string
): void {
  seedRecord(world, `${storySlug}:${id}`, "story_character_authority_record", `stories/${storySlug}/story-characters/${id}.md`, {
    id,
    title: `Existing STCHAR ${id}`
  });
  world.db
    .prepare("UPDATE nodes SET story_slug = ?, node_id = ? WHERE node_id = ?")
    .run(storySlug, id, `${storySlug}:${id}`);
}

function seedScnRecord(
  world: ReturnType<typeof createIndexedTestWorld>,
  storySlug: string,
  id: string
): void {
  seedRecord(world, `${storySlug}:${id}`, "scene_record", `stories/${storySlug}/_source/scenes/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    branch_id: "BR-1",
    supersedes: null,
    status: "planned",
    pg_ids: ["PG-1"],
    start_page_id: "PG-1",
    end_page_id: "PG-1",
    previous_scene_id: null,
    choice_surface_page_id: "PG-1",
    emitted_choice_ids: ["CHC-1"],
    title: "Bench Conversation",
    slug: "bench-conversation",
    prose_plan_path: `scene-prose-plans/${id}.md`,
    prose_path: `scene-prose/${id}.md`,
    receipt_path: `scene-prose-receipts/${id}.yaml`
  });
  world.db
    .prepare("UPDATE nodes SET story_slug = ?, node_id = ? WHERE node_id = ?")
    .run(storySlug, id, `${storySlug}:${id}`);
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
