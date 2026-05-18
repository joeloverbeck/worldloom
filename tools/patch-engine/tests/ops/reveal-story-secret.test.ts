import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";

import { assertOpError, baseEnvelope, createTestWorld, seedRecord } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageRevealStorySecret } from "../../src/ops/reveal-story-secret.js";

test("reveal_story_secret sets status, reveal_event, and reveal_records", async (t) => {
  const world = createTestWorld(t);
  seedSecret(world);
  const env = baseEnvelope();
  const op = {
    op: "reveal_story_secret",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_secret_id: "STSEC-1",
      reveal_event: "SE-3",
      reveal_records: ["BEL-2", "SF-1"]
    }
  } satisfies Extract<PatchOperation, { op: "reveal_story_secret" }>;

  const staged = await stageRevealStorySecret(env, op, world.ctx);
  const parsed = YAML.parse(staged.new_content) as Record<string, unknown>;

  assert.equal(parsed.status, "revealed");
  assert.equal(parsed.reveal_event, "SE-3");
  assert.deepEqual(parsed.reveal_records, ["BEL-1", "BEL-2", "SF-1"]);
});

test("reveal_story_secret rejects non-reveal record ids", async (t) => {
  const world = createTestWorld(t);
  seedSecret(world);
  const env = baseEnvelope();
  const op = {
    op: "reveal_story_secret",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_secret_id: "STSEC-1",
      reveal_event: "SE-3",
      reveal_records: ["THR-1"]
    }
  } satisfies Extract<PatchOperation, { op: "reveal_story_secret" }>;

  await assertOpError(() => stageRevealStorySecret(env, op, world.ctx), "invalid_record_id");
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
      status: "partially_revealed",
      reveal_records: ["BEL-1"]
    },
    "harbor-ledgers"
  );
}
