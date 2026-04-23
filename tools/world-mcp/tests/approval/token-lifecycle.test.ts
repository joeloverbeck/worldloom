import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseToken, readOrCreateSecret, signToken } from "../../src/approval/token";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared";

function resolveSecretPath(root: string): string {
  return path.join(root, "tools", "world-mcp", ".secret");
}

test("readOrCreateSecret creates .secret on first use with mode 0600", () => {
  const root = createTempRepoRoot();

  try {
    withRepoRoot(root, () => {
      const secret = readOrCreateSecret();

      assert.equal(secret.length, 32);
      assert.equal(existsSync(resolveSecretPath(root)), true);
      assert.equal(statSync(resolveSecretPath(root)).mode & 0o777, 0o600);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("readOrCreateSecret reuses an existing .secret file", () => {
  const root = createTempRepoRoot();

  try {
    withRepoRoot(root, () => {
      const first = readOrCreateSecret();
      const second = readOrCreateSecret();

      assert.deepEqual(second, first);
      assert.deepEqual(readFileSync(resolveSecretPath(root)), first);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("readOrCreateSecret regenerates new entropy after manual deletion", () => {
  const root = createTempRepoRoot();

  try {
    withRepoRoot(root, () => {
      const first = readOrCreateSecret();
      rmSync(resolveSecretPath(root));

      const second = readOrCreateSecret();

      assert.equal(second.length, 32);
      assert.notDeepEqual(second, first);
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("signToken and parseToken round-trip the exact payload and signature bytes", () => {
  const secret = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
  const token = signToken(
    {
      plan_id: "plan-001",
      world_slug: "animalia",
      patch_hashes: ["hash-a", "hash-b"],
      issued_at: "2026-04-23T10:00:00.000Z",
      expires_at: "2026-04-23T10:05:00.000Z"
    },
    secret
  );

  const { payload, signature } = parseToken(token);
  const recomputed = createHmac("sha256", secret).update(JSON.stringify(payload), "utf8").digest();

  assert.deepEqual(payload, {
    plan_id: "plan-001",
    world_slug: "animalia",
    patch_hashes: ["hash-a", "hash-b"],
    issued_at: "2026-04-23T10:00:00.000Z",
    expires_at: "2026-04-23T10:05:00.000Z"
  });
  assert.deepEqual(signature, recomputed);
});

test("tampering one payload byte causes HMAC recomputation to mismatch", () => {
  const secret = Buffer.from("abcdef0123456789abcdef0123456789", "utf8");
  const token = signToken(
    {
      plan_id: "plan-002",
      world_slug: "animalia",
      patch_hashes: ["hash-a"],
      issued_at: "2026-04-23T11:00:00.000Z",
      expires_at: "2026-04-23T11:05:00.000Z"
    },
    secret
  );

  const decoded = Buffer.from(token, "base64").toString("utf8");
  const separatorIndex = decoded.lastIndexOf(".");
  const payloadJson = decoded.slice(0, separatorIndex);
  const signatureHex = decoded.slice(separatorIndex + 1);
  const tamperedPayloadJson = payloadJson.replace("\"animalia\"", "\"animalib\"");
  const tamperedToken = Buffer.from(`${tamperedPayloadJson}.${signatureHex}`, "utf8").toString("base64");

  const { payload, signature } = parseToken(tamperedToken);
  const recomputed = createHmac("sha256", secret).update(JSON.stringify(payload), "utf8").digest();

  assert.notDeepEqual(signature, recomputed);
});

test("signToken defaults expires_at to issued_at plus five minutes and warns for past expiry input", () => {
  const secret = Buffer.from("fedcba9876543210fedcba9876543210", "utf8");
  const warnings: string[] = [];
  const originalEmitWarning = process.emitWarning;

  try {
    process.emitWarning = ((warning: string | Error) => {
      warnings.push(typeof warning === "string" ? warning : warning.message);
      return undefined;
    }) as typeof process.emitWarning;

    const defaultedToken = signToken(
      {
        plan_id: "plan-003",
        world_slug: "animalia",
        patch_hashes: ["hash-a"],
        issued_at: "2026-04-23T12:00:00.000Z"
      },
      secret
    );
    const { payload: defaultedPayload } = parseToken(defaultedToken);

    assert.equal(defaultedPayload.expires_at, "2026-04-23T12:05:00.000Z");
    assert.equal(warnings.length, 0);

    const expiredToken = signToken(
      {
        plan_id: "plan-004",
        world_slug: "animalia",
        patch_hashes: ["hash-b"],
        issued_at: "2026-04-23T12:00:00.000Z",
        expires_at: "2026-04-23T11:59:00.000Z"
      },
      secret
    );
    const { payload: expiredPayload } = parseToken(expiredToken);

    assert.equal(expiredPayload.expires_at, "2026-04-23T11:59:00.000Z");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0] ?? "", /expires before it is issued/);
  } finally {
    process.emitWarning = originalEmitWarning;
  }
});
