import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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
  assert.equal(replayed.ok, false);
  assert.equal(replayed.code, "approval_replayed");
});

test("verifyApprovalToken includes a recovery hint for replayed approval tokens", (t) => {
  const world = createTestWorld(t);
  const secret = Buffer.from("unit-test-secret");
  const patch = createOp({ op: "create_cf_record", target_world: world.worldSlug, payload: { cf_record: canonFact("CF-0099") } } satisfies Extract<PatchOperation, { op: "create_cf_record" }>);
  const envelope = { ...baseEnvelope({ cf_ids: ["CF-0099"] }), patches: [patch] };
  const token = signedToken({ envelope, secret });
  const verdict = verifyApprovalToken(token, envelope, { db: world.db, hmac_secret: secret, now: new Date("2026-04-25T12:00:00.000Z") });

  assert.equal(verdict.ok, true);
  if (verdict.ok) {
    markTokenConsumed(verdict.token_hash, envelope.plan_id, { db: world.db, hmac_secret: secret });
  }
  const replayed = verifyApprovalToken(token, envelope, { db: world.db, hmac_secret: secret, now: new Date("2026-04-25T12:00:00.000Z") });
  assert.equal(replayed.ok, false);
  assert.equal(replayed.code, "approval_replayed");
  assert.match(replayed.detail ?? "", /single-use|already consumed/);
  assert.match(replayed.detail ?? "", /prior successful submit/);
  assert.match(replayed.detail ?? "", /HARD-GATE-DISCIPLINE/);
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

test("verifyApprovalToken includes recovery hints for malformed approval-token families", (t) => {
  const world = createTestWorld(t);
  const secret = Buffer.from("unit-test-secret");
  const envelope = baseEnvelope();
  const now = new Date("2026-04-25T12:00:00.000Z");
  const cases: Array<{ name: string; token: string; detail: string }> = [
    {
      name: "invalid base64",
      token: "not a token!",
      detail: "token contains invalid base64"
    },
    {
      name: "missing separator",
      token: encodedToken("placeholder"),
      detail: "token must contain a signature separator"
    },
    {
      name: "non-hex signature",
      token: encodedToken("{}.zz"),
      detail: "token signature must be hex"
    },
    {
      name: "invalid payload JSON",
      token: signedRawPayload("not-json", secret),
      detail: "payload is not valid JSON"
    },
    {
      name: "payload not object",
      token: signedRawPayload("null", secret),
      detail: "payload must be an object"
    },
    {
      name: "payload invalid fields",
      token: signedRawPayload("{}", secret),
      detail: "payload has invalid fields"
    }
  ];

  for (const testCase of cases) {
    const verdict = verifyApprovalToken(testCase.token, envelope, { db: world.db, hmac_secret: secret, now });
    assert.equal(verdict.ok, false, testCase.name);
    assert.equal(verdict.code, "approval_malformed", testCase.name);
    assert.ok(verdict.detail?.startsWith(testCase.detail), testCase.name);
    assert.match(verdict.detail ?? "", /sign-approval-token/, testCase.name);
    assert.match(verdict.detail ?? "", /HARD-GATE-DISCIPLINE/, testCase.name);
  }
});

function failureCode(verdict: ReturnType<typeof verifyApprovalToken>): string {
  assert.equal(verdict.ok, false);
  return verdict.code;
}

function encodedToken(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signedRawPayload(payload: string, secret: Buffer): string {
  const signature = createHmac("sha256", secret).update(Buffer.from(payload, "utf8")).digest("hex");
  return encodedToken(`${payload}.${signature}`);
}
