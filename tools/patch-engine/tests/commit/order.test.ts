import assert from "node:assert/strict";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { autoAddTouchedByCfOps, reorderPatches } from "../../src/commit/order.js";
import { addPatchedByEdge, baseEnvelope, canonFact, character, createOp, createTestWorld, extension, seedStandardRecords } from "../harness.js";

test("reorderPatches applies canonical tier ordering while preserving tier-local order", () => {
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

test("autoAddTouchedByCfOps injects append_touched_by_cf only when needed", (t) => {
  const world = createTestWorld(t);
  seedStandardRecords(world);
  const env = baseEnvelope();
  const append = createOp({ op: "append_extension", target_world: env.target_world, payload: { target_record_id: "SEC-ELF-001", extension: extension("CF-0002") } } satisfies Extract<PatchOperation, { op: "append_extension" }>);
  const expanded = autoAddTouchedByCfOps([append], world.ctx);

  assert.deepEqual(expanded.map((patch) => patch.op), ["append_extension", "append_touched_by_cf"]);
  assert.deepEqual(expanded[1], {
    op: "append_touched_by_cf",
    target_world: env.target_world,
    target_record_id: "SEC-ELF-001",
    payload: { target_sec_id: "SEC-ELF-001", cf_id: "CF-0002" }
  });

  addPatchedByEdge(world, "SEC-ELF-001", "CF-0002");
  assert.deepEqual(autoAddTouchedByCfOps([append], world.ctx), [append]);
});
