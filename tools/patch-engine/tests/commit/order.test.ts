import assert from "node:assert/strict";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { reorderPatches } from "../../src/commit/order.js";
import { baseEnvelope, canonFact, character, createOp, extension } from "../harness.js";

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
