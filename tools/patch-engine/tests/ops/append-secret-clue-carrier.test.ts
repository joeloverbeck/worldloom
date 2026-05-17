import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";

import { assertOpError, baseEnvelope, createTestWorld, seedRecord } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendSecretClueCarrier } from "../../src/ops/append-secret-clue-carrier.js";

test("append_secret_clue_carrier appends a carrier to STSEC clue_carriers", async (t) => {
  const world = createTestWorld(t);
  seedSecret(world);
  const env = baseEnvelope();
  const op = {
    op: "append_secret_clue_carrier",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_secret_id: "STSEC-1",
      clue_carrier: {
        kind: "DA",
        record: "DA-1",
        clue_text: "The margin nickname matches Sera's brother.",
        clue_strength: "suggestive",
        discovered_by: [],
        audience_visible: "hidden",
        status: "available"
      }
    }
  } satisfies Extract<PatchOperation, { op: "append_secret_clue_carrier" }>;

  const staged = await stageAppendSecretClueCarrier(env, op, world.ctx);
  const parsed = YAML.parse(staged.new_content) as Record<string, unknown>;

  assert.deepEqual(parsed.clue_carriers, [op.payload.clue_carrier]);
});

test("append_secret_clue_carrier rejects non-carrier record ids", async (t) => {
  const world = createTestWorld(t);
  seedSecret(world);
  const env = baseEnvelope();
  const op = {
    op: "append_secret_clue_carrier",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_secret_id: "STSEC-1",
      clue_carrier: {
        kind: "STCLUE",
        record: "STCLUE-1",
        clue_text: "Bad parallel clue class.",
        clue_strength: "suggestive",
        discovered_by: [],
        audience_visible: "hidden",
        status: "available"
      }
    }
  } satisfies Extract<PatchOperation, { op: "append_secret_clue_carrier" }>;

  await assertOpError(() => stageAppendSecretClueCarrier(env, op, world.ctx), "invalid_record_id");
});

function seedSecret(world: ReturnType<typeof createTestWorld>): void {
  seedRecord(
    world,
    "harbor-ledgers:STSEC-1",
    "story_secret_record",
    "stories/harbor-ledgers/_source/secrets/STSEC-1.yaml",
    {
      id: "STSEC-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      secret_kind: "motive",
      secret_claim: "Sera hid the ledger to protect her brother.",
      holders: ["STENT-1"],
      salience: "high",
      source_records: ["BEL-1"],
      status: "hidden"
    },
    "harbor-ledgers"
  );
}
