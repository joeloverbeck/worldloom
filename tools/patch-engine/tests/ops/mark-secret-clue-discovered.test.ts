import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";

import { assertOpError, baseEnvelope, createTestWorld, seedRecord } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageMarkSecretClueDiscovered } from "../../src/ops/mark-secret-clue-discovered.js";

test("mark_secret_clue_discovered updates carrier status and discoverer", async (t) => {
  const world = createTestWorld(t);
  seedSecret(world);
  const env = baseEnvelope();
  const op = {
    op: "mark_secret_clue_discovered",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_secret_id: "STSEC-1",
      carrier_record: "DA-1",
      discovered_by: "STENT-2"
    }
  } satisfies Extract<PatchOperation, { op: "mark_secret_clue_discovered" }>;

  const staged = await stageMarkSecretClueDiscovered(env, op, world.ctx);
  const parsed = YAML.parse(staged.new_content) as { clue_carriers: Array<Record<string, unknown>> };

  assert.equal(parsed.clue_carriers[0]?.status, "discovered");
  assert.deepEqual(parsed.clue_carriers[0]?.discovered_by, ["STENT-1", "STENT-2"]);
});

test("mark_secret_clue_discovered rejects missing carrier records", async (t) => {
  const world = createTestWorld(t);
  seedSecret(world);
  const env = baseEnvelope();
  const op = {
    op: "mark_secret_clue_discovered",
    target_world: env.target_world,
    payload: {
      story_slug: "harbor-ledgers",
      target_secret_id: "STSEC-1",
      carrier_record: "SF-99",
      discovered_by: "STENT-2"
    }
  } satisfies Extract<PatchOperation, { op: "mark_secret_clue_discovered" }>;

  await assertOpError(() => stageMarkSecretClueDiscovered(env, op, world.ctx), "record_not_found");
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
      clue_carriers: [
        {
          kind: "DA",
          record: "DA-1",
          clue_text: "The margin nickname matches Sera's brother.",
          clue_strength: "suggestive",
          discovered_by: ["STENT-1"],
          audience_visible: "hidden",
          status: "available"
        }
      ],
      source_records: ["BEL-1"],
      status: "hidden"
    },
    "harbor-ledgers"
  );
}
