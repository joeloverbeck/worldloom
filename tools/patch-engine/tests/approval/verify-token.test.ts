import assert from "node:assert/strict";
import { test } from "node:test";

import type { PatchOperation } from "../../src/envelope/schema.js";
import { markTokenConsumed, verifyApprovalToken } from "../../src/approval/verify-token.js";
import { baseEnvelope, canonFact, createOp, createTestWorld, signedToken } from "../harness.js";

test("verifyApprovalToken accepts a fresh token and rejects replay", (t) => {
  const world = createTestWorld(t);
  const secret = Buffer.from("unit-test-secret");
  const patch = createOp({ op: "create_cf_record", target_world: world.worldSlug, payload: { cf_record: canonFact("CF-0099") } } satisfies Extract<PatchOperation, { op: "create_cf_record" }>);
  const envelope = { ...baseEnvelope({ cf_ids: ["CF-0099"] }), patches: [patch] };
  const token = signedToken({ envelope, secret });
  const verdict = verifyApprovalToken(token, envelope, { db: world.db, hmac_secret: secret, now: new Date("2026-04-25T12:00:00.000Z") });

  assert.deepEqual(verdict.ok, true);
  assert.equal(verdict.ok && verdict.token_hash.length, 64);
  if (verdict.ok) {
    markTokenConsumed(verdict.token_hash, envelope.plan_id, { db: world.db, hmac_secret: secret });
  }
  const replayed = verifyApprovalToken(token, envelope, { db: world.db, hmac_secret: secret, now: new Date("2026-04-25T12:00:00.000Z") });
  assert.deepEqual(replayed, { ok: false, code: "approval_replayed" });
});

test("verifyApprovalToken rejects expired, tampered, hash-mismatch, and malformed tokens", (t) => {
  const world = createTestWorld(t);
  const secret = Buffer.from("unit-test-secret");
  const patch = createOp({ op: "create_cf_record", target_world: world.worldSlug, payload: { cf_record: canonFact("CF-0099") } } satisfies Extract<PatchOperation, { op: "create_cf_record" }>);
  const envelope = { ...baseEnvelope({ cf_ids: ["CF-0099"] }), patches: [patch] };
  const now = new Date("2026-04-25T12:00:00.000Z");

  assert.equal(failureCode(verifyApprovalToken(signedToken({ envelope, secret, expiresAt: "2026-04-25T00:00:00.000Z" }), envelope, { db: world.db, hmac_secret: secret, now })), "approval_expired");
  assert.equal(failureCode(verifyApprovalToken(signedToken({ envelope, secret: Buffer.from("wrong-secret") }), envelope, { db: world.db, hmac_secret: secret, now })), "approval_invalid_hmac");
  assert.equal(failureCode(verifyApprovalToken(signedToken({ envelope, secret, patchHashes: ["wrong"] }), envelope, { db: world.db, hmac_secret: secret, now })), "approval_hash_mismatch");
  assert.equal(failureCode(verifyApprovalToken("not a token!", envelope, { db: world.db, hmac_secret: secret, now })), "approval_malformed");
});

function failureCode(verdict: ReturnType<typeof verifyApprovalToken>): string {
  assert.equal(verdict.ok, false);
  return verdict.code;
}
