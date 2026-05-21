import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { sha256Hex } from "@worldloom/world-index/hash/content";

import { submitPatchPlan, type EngineError, type PatchReceipt } from "../../src/apply.js";
import type { PatchOperation, PatchPlanEnvelope } from "../../src/envelope/schema.js";
import {
  baseEnvelope,
  createIndexedTestWorld,
  createOp,
  extension,
  signedToken,
  writeSecret
} from "../harness.js";

test("index-stale-preapply: stale hybrid file returns index_stale before validators run or writes stage", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("index-stale-preapply-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const stalePath = seedHybridFileVersion(world, "characters/stale-character.md", "old indexed body");
  fs.writeFileSync(stalePath, "new on-disk body", "utf8");
  const { envelope, token } = appendExtensionEnvelope(world, secret);
  let validatorInvoked = false;

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => {
      validatorInvoked = true;
      return { ok: true };
    }
  });

  assertEngineError(result, "index_stale");
  assert.equal(validatorInvoked, false, "stale-index rejection must happen before validators run");
  assert.match(result.message, /world-index\/dist\/src\/cli\.js sync minimal-world/);
  assert.deepEqual(result.detail, {
    divergent_files: [
      {
        file_path: "characters/stale-character.md",
        on_disk_content_hash: sha256Hex("new on-disk body"),
        indexed_content_hash: sha256Hex("old indexed body")
      }
    ]
  });
  assertOriginalSecFile(world);
});

test("index-stale-preapply: stale story-character hybrid file returns index_stale", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("index-stale-stchar-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  const stcharPath = seedHybridFileVersion(
    world,
    "stories/ember-arc/story-characters/STCHAR-1.md",
    "old indexed STCHAR body"
  );
  fs.writeFileSync(stcharPath, "new on-disk STCHAR body", "utf8");
  const { envelope, token } = appendExtensionEnvelope(world, secret);
  let validatorInvoked = false;

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => {
      validatorInvoked = true;
      return { ok: true };
    }
  });

  assertEngineError(result, "index_stale");
  assert.equal(validatorInvoked, false, "stale-index rejection must happen before validators run");
  assert.deepEqual(result.detail, {
    divergent_files: [
      {
        file_path: "stories/ember-arc/story-characters/STCHAR-1.md",
        on_disk_content_hash: sha256Hex("new on-disk STCHAR body"),
        indexed_content_hash: sha256Hex("old indexed STCHAR body")
      }
    ]
  });
  assertOriginalSecFile(world);
});

test("index-stale-preapply: fresh index preserves validator_failed response", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("index-stale-validator-failed-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  seedHybridFileVersion(world, "characters/fresh-character.md", "fresh indexed body");
  const { envelope, token } = appendExtensionEnvelope(world, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({
      ok: false,
      code: "validator_failed",
      message: "Pre-apply validators reported 1 failure(s).",
      detail: { verdicts: [{ validator: "record_schema_compliance" }] }
    })
  });

  assertEngineError(result, "validator_failed");
  assert.equal((result.detail as { verdicts?: unknown[] }).verdicts?.length, 1);
  assertOriginalSecFile(world);
});

test("index-stale-preapply: fresh index with passing validators still applies successfully", async (t) => {
  const world = createIndexedTestWorld(t);
  const secret = Buffer.from("index-stale-success-secret");
  const secretPath = writeSecret(world.worldRoot, secret);
  seedHybridFileVersion(world, "characters/fresh-character.md", "fresh indexed body");
  const { envelope, token } = appendExtensionEnvelope(world, secret);

  const result = await submitPatchPlan(envelope, token, {
    worldRoot: world.worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({ ok: true })
  });

  assertReceipt(result);
  assert.equal(result.files_written.length, 1);
  assert.equal(
    result.files_written[0]?.file_path,
    path.join(world.worldRoot, "worlds", world.worldSlug, "_source", "everyday-life", "SEC-ELF-001.yaml")
  );
});

function seedHybridFileVersion(
  world: ReturnType<typeof createIndexedTestWorld>,
  filePath: string,
  content: string
): string {
  const absolutePath = path.join(world.worldRoot, "worlds", world.worldSlug, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
  world.db
    .prepare(
      `
        INSERT INTO file_versions (
          world_slug,
          file_path,
          content_hash,
          last_indexed_at
        ) VALUES (?, ?, ?, ?)
      `
    )
    .run(world.worldSlug, filePath, sha256Hex(content), new Date().toISOString());
  return absolutePath;
}

function appendExtensionEnvelope(
  world: ReturnType<typeof createIndexedTestWorld>,
  secret: Buffer
): { envelope: PatchPlanEnvelope; token: string } {
  const secRow = world.db.prepare("SELECT content_hash FROM nodes WHERE node_id = 'SEC-ELF-001'").get() as {
    content_hash: string;
  };
  const envelope = {
    ...baseEnvelope(),
    patches: [
      createOp({
        op: "append_extension",
        target_world: world.worldSlug,
        expected_content_hash: secRow.content_hash,
        payload: {
          target_record_id: "SEC-ELF-001",
          extension: {
            ...extension("CF-0001"),
            change_id: "CH-0001",
            label: "Index-stale test extension"
          }
        }
      } satisfies Extract<PatchOperation, { op: "append_extension" }>)
    ]
  };
  return {
    envelope,
    token: signedToken({ envelope, secret, expiresAt: "2999-01-01T00:00:00.000Z" })
  };
}

function assertOriginalSecFile(world: ReturnType<typeof createIndexedTestWorld>): void {
  const secPath = path.join(
    world.worldRoot,
    "worlds",
    world.worldSlug,
    "_source",
    "everyday-life",
    "SEC-ELF-001.yaml"
  );
  assert.doesNotMatch(fs.readFileSync(secPath, "utf8"), /Index-stale test extension/);
}

function assertEngineError(result: PatchReceipt | EngineError, code: string): asserts result is EngineError {
  assert.ok("ok" in result, `expected EngineError ${code}, got ${JSON.stringify(result)}`);
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
}

function assertReceipt(result: PatchReceipt | EngineError): asserts result is PatchReceipt {
  assert.ok(!("ok" in result), `expected PatchReceipt, got ${JSON.stringify(result)}`);
}
