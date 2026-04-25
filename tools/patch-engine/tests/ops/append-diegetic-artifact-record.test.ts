import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendDiegeticArtifactRecord } from "../../src/ops/append-diegetic-artifact-record.js";
import { assertOpError, baseEnvelope, createOp, createTestWorld, diegeticArtifact } from "../harness.js";

test("append_diegetic_artifact_record writes under diegetic-artifacts", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const op = createOp({ op: "append_diegetic_artifact_record", target_world: env.target_world, target_file: "diegetic-artifacts/test-artifact.md", payload: { da_record: diegeticArtifact("DA-0099"), body_markdown: "Body.", filename: "test-artifact.md" } } satisfies Extract<PatchOperation, { op: "append_diegetic_artifact_record" }>);

  const staged = await stageAppendDiegeticArtifactRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "diegetic-artifacts/test-artifact.md"));
  assert.match(fs.readFileSync(staged.temp_file_path, "utf8"), /artifact_id: DA-0099/);
});

test("append_diegetic_artifact_record rejects traversal and existing files", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const payload = { da_record: diegeticArtifact("DA-0099"), body_markdown: "Body.", filename: "test-artifact.md" };
  const existingPath = path.join(world.worldRoot, "worlds", world.worldSlug, "diegetic-artifacts/test-artifact.md");
  fs.mkdirSync(path.dirname(existingPath), { recursive: true });
  fs.writeFileSync(existingPath, "exists", "utf8");

  await assertOpError(() => stageAppendDiegeticArtifactRecord(env, createOp({ op: "append_diegetic_artifact_record", target_world: env.target_world, target_file: "../test-artifact.md", payload } satisfies Extract<PatchOperation, { op: "append_diegetic_artifact_record" }>), world.ctx), "target_file_outside_world");
  await assertOpError(() => stageAppendDiegeticArtifactRecord(env, createOp({ op: "append_diegetic_artifact_record", target_world: env.target_world, target_file: "diegetic-artifacts/test-artifact.md", payload } satisfies Extract<PatchOperation, { op: "append_diegetic_artifact_record" }>), world.ctx), "file_already_exists");
});
