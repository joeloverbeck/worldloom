import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { stageAppendAdjudicationRecord } from "../../src/ops/append-adjudication-record.js";
import { assertOpError, baseEnvelope, createOp, createTestWorld } from "../harness.js";

test("append_adjudication_record writes under adjudications", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const op = createOp({ op: "append_adjudication_record", target_world: env.target_world, target_file: "adjudications/PA-0099.md", payload: { adjudication_frontmatter: { id: "PA-0099", verdict: "accepted", date: "2026-04-25", originating_skill: "unit-test" }, body_markdown: "Body." } } satisfies Extract<PatchOperation, { op: "append_adjudication_record" }>);

  const staged = await stageAppendAdjudicationRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "adjudications/PA-0099.md"));
  assert.match(fs.readFileSync(staged.temp_file_path, "utf8"), /verdict: accepted/);
});

test("append_adjudication_record rejects traversal and existing files", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const basePayload = { adjudication_frontmatter: { id: "PA-0099", verdict: "accepted", date: "2026-04-25", originating_skill: "unit-test" }, body_markdown: "Body." };
  const existingPath = path.join(world.worldRoot, "worlds", world.worldSlug, "adjudications/PA-0099.md");
  fs.mkdirSync(path.dirname(existingPath), { recursive: true });
  fs.writeFileSync(existingPath, "exists", "utf8");

  await assertOpError(() => stageAppendAdjudicationRecord(env, createOp({ op: "append_adjudication_record", target_world: env.target_world, target_file: "../PA-0099.md", payload: basePayload } satisfies Extract<PatchOperation, { op: "append_adjudication_record" }>), world.ctx), "target_file_outside_world");
  await assertOpError(() => stageAppendAdjudicationRecord(env, createOp({ op: "append_adjudication_record", target_world: env.target_world, target_file: "adjudications/PA-0099.md", payload: basePayload } satisfies Extract<PatchOperation, { op: "append_adjudication_record" }>), world.ctx), "file_already_exists");
});
