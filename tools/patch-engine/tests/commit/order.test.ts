import assert from "node:assert/strict";
import { test } from "node:test";

import { OPERATION_KINDS, type PatchOperation } from "../../src/envelope/schema.js";
import { reorderPatches } from "../../src/commit/order.js";
import { baseEnvelope, canonFact, character, createOp, extension } from "../harness.js";

function bareOp(kind: PatchOperation["op"]): PatchOperation {
  return { op: kind, target_world: "test-world", payload: {} } as unknown as PatchOperation;
}

test("reorderPatches applies canonical tier ordering while preserving ordinary tier-local order", () => {
  const env = baseEnvelope();
  const tier3 = createOp({ op: "append_character_record", target_world: env.target_world, target_file: "characters/test.md", payload: { char_record: character("CHAR-0099"), body_markdown: "Body.", filename: "test.md" } } satisfies Extract<PatchOperation, { op: "append_character_record" }>);
  const tier1a = createOp({ op: "create_cf_record", target_world: env.target_world, payload: { cf_record: canonFact("CF-0099") } } satisfies Extract<PatchOperation, { op: "create_cf_record" }>);
  const tier2 = createOp({ op: "append_extension", target_world: env.target_world, payload: { target_record_id: "SEC-ELF-001", extension: extension("CF-0099") } } satisfies Extract<PatchOperation, { op: "append_extension" }>);
  const tier1b = createOp({ op: "create_cf_record", target_world: env.target_world, payload: { cf_record: canonFact("CF-0100") } } satisfies Extract<PatchOperation, { op: "create_cf_record" }>);

  assert.deepEqual(reorderPatches([tier3, tier1a, tier2, tier1b]).map((patch) => patch.op), [
    "create_cf_record",
    "create_cf_record",
    "append_extension",
    "append_character_record"
  ]);
  assert.equal(reorderPatches([tier3, tier1a, tier2, tier1b])[1], tier1b);
});

test("reorderPatches stages SCN records after PG records in the create tier", () => {
  const env = baseEnvelope();
  const scn = createOp({
    op: "create_scn_record",
    target_world: env.target_world,
    payload: {
      story_slug: "red-bunny",
      record: {
        id: "SCN-1",
        story_id: "STORY-1",
        branch_id: "BR-1",
        supersedes: null,
        status: "planned",
        pg_ids: ["PG-1"],
        start_page_id: "PG-1",
        end_page_id: "PG-1",
        previous_scene_id: null,
        choice_surface_page_id: "PG-1",
        emitted_choice_ids: [],
        title: "Opening",
        slug: "opening",
        prose_plan_path: "scene-prose-plans/SCN-1.md",
        prose_path: "scene-prose/SCN-1.md",
        receipt_path: "scene-prose-receipts/SCN-1.yaml"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_scn_record" }>);
  const pg = createOp({
    op: "create_pg_record",
    target_world: env.target_world,
    payload: {
      story_slug: "red-bunny",
      record: {
        id: "PG-1"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_pg_record" }>);
  const sf = createOp({
    op: "create_sf_record",
    target_world: env.target_world,
    payload: {
      story_slug: "red-bunny",
      record: {
        id: "SF-1"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_sf_record" }>);

  assert.deepEqual(reorderPatches([scn, pg, sf]).map((patch) => patch.op), [
    "create_sf_record",
    "create_pg_record",
    "create_scn_record"
  ]);
});

test("reorderPatches never silently drops a registered operation kind", () => {
  // Footgun guard: a new op added to OPERATION_KINDS (and dispatched in
  // temp-file.ts) but omitted from order.ts's tier sets would be silently
  // filtered out of the staged plan, producing a no-op apply with no error.
  const patches = OPERATION_KINDS.map((kind) => bareOp(kind));

  const result = reorderPatches(patches);

  const dropped = OPERATION_KINDS.filter((kind) => !result.some((patch) => patch.op === kind));
  assert.deepEqual(dropped, [], `reorderPatches dropped op kind(s): ${dropped.join(", ")}`);
  assert.equal(result.length, OPERATION_KINDS.length);
});

test("reorderPatches stages repair_storylet_created_at_page after create ops", () => {
  const repair = bareOp("repair_storylet_created_at_page");
  const create = bareOp("create_slt_record");

  assert.deepEqual(reorderPatches([repair, create]).map((patch) => patch.op), [
    "create_slt_record",
    "repair_storylet_created_at_page"
  ]);
});
