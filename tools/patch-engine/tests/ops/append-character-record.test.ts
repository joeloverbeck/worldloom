import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendCharacterRecord } from "../../src/ops/append-character-record.js";
import { assertOpError, baseEnvelope, character, createOp, createTestWorld } from "../harness.js";

test("append_character_record writes under characters", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const op = createOp({ op: "append_character_record", target_world: env.target_world, target_file: "characters/test-character.md", payload: { char_record: character("CHAR-0099"), body_markdown: "Body.", filename: "test-character.md" } } satisfies Extract<PatchOperation, { op: "append_character_record" }>);

  const staged = await stageAppendCharacterRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "characters/test-character.md"));
  assert.match(fs.readFileSync(staged.temp_file_path, "utf8"), /character_id: CHAR-0099/);
});

test("append_character_record rejects traversal and existing files", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const payload = { char_record: character("CHAR-0099"), body_markdown: "Body.", filename: "test-character.md" };
  const existingPath = path.join(world.worldRoot, "worlds", world.worldSlug, "characters/test-character.md");
  fs.mkdirSync(path.dirname(existingPath), { recursive: true });
  fs.writeFileSync(existingPath, "exists", "utf8");

  await assertOpError(() => stageAppendCharacterRecord(env, createOp({ op: "append_character_record", target_world: env.target_world, target_file: "../test-character.md", payload } satisfies Extract<PatchOperation, { op: "append_character_record" }>), world.ctx), "target_file_outside_world");
  await assertOpError(() => stageAppendCharacterRecord(env, createOp({ op: "append_character_record", target_world: env.target_world, target_file: "characters/test-character.md", payload } satisfies Extract<PatchOperation, { op: "append_character_record" }>), world.ctx), "file_already_exists");
});
