import assert from "node:assert/strict";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { reorderPatches } from "../../src/commit/order.js";
import { baseEnvelope, canonFact, character, createOp, extension } from "../harness.js";

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
