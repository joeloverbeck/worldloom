import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type Database from "better-sqlite3";

import type { PatchOperation, PatchPlanEnvelope } from "../envelope/schema.js";
import { serializeStableYaml } from "../ops/shared.js";

export interface ApprovalContext {
  db: Database.Database;
  hmac_secret: Buffer;
  now?: Date;
}

export type ApprovalErrorCode =
  | "approval_invalid_hmac"
  | "approval_expired"
  | "approval_replayed"
  | "approval_hash_mismatch"
  | "approval_malformed";

export type ApprovalVerdict =
  | {
      ok: true;
      token_hash: string;
    }
  | {
      ok: false;
      code: ApprovalErrorCode;
      detail?: string;
    };

interface ApprovalTokenPayload {
  plan_id: string;
  world_slug: string;
  patch_hashes: string[];
  issued_at: string;
  expires_at: string;
}

type ApprovalFailure = Extract<ApprovalVerdict, { ok: false }>;
type ParsedSignedToken =
  | { ok: true; payloadBytes: Buffer; signature: Buffer }
  | ApprovalFailure;
type ParsedPayload = { ok: true; value: ApprovalTokenPayload } | ApprovalFailure;

export function verifyApprovalToken(
  token: string,
  envelope: PatchPlanEnvelope,
  ctx: ApprovalContext
): ApprovalVerdict {
  const parsedToken = parseSignedToken(token);
  if (!parsedToken.ok) {
    return parsedToken;
  }

  const expectedHmac = createHmac("sha256", ctx.hmac_secret)
    .update(parsedToken.payloadBytes)
    .digest();

  if (!safeEqualDigest(expectedHmac, parsedToken.signature)) {
    return { ok: false, code: "approval_invalid_hmac" };
  }

  const payload = parsePayload(parsedToken.payloadBytes);
  if (!payload.ok) {
    return payload;
  }

  if (payload.value.plan_id !== envelope.plan_id || payload.value.world_slug !== envelope.target_world) {
    return {
      ok: false,
      code: "approval_hash_mismatch",
      detail: "approval token is not bound to this envelope"
    };
  }

  if (Date.parse(payload.value.expires_at) <= (ctx.now ?? new Date()).getTime()) {
    return { ok: false, code: "approval_expired" };
  }

  const envelopePatchHashes = envelope.patches.map(canonicalOpHash);
  if (!sameStringArray(payload.value.patch_hashes, envelopePatchHashes)) {
    return { ok: false, code: "approval_hash_mismatch" };
  }

  const tokenHash = sha256Hex(token);
  const existing = ctx.db
    .prepare("SELECT 1 FROM approval_tokens_consumed WHERE token_hash = ?")
    .get(tokenHash);

  if (existing !== undefined) {
    return { ok: false, code: "approval_replayed" };
  }

  return { ok: true, token_hash: tokenHash };
}

export function markTokenConsumed(
  token_hash: string,
  plan_id: string,
  ctx: ApprovalContext
): void {
  ctx.db
    .prepare(
      `
        INSERT INTO approval_tokens_consumed (token_hash, consumed_at, plan_id)
        VALUES (?, ?, ?)
      `
    )
    .run(token_hash, new Date().toISOString(), plan_id);
}

export function canonicalOpHash(op: PatchOperation): string {
  return sha256Hex(serializeStableYaml(op));
}

function parseSignedToken(
  token: string
): ParsedSignedToken {
  const decoded = decodeBase64Token(token);
  if (decoded === null) {
    return { ok: false, code: "approval_malformed", detail: "token contains invalid base64" };
  }

  const separatorIndex = decoded.lastIndexOf(".");
  if (separatorIndex === -1) {
    return { ok: false, code: "approval_malformed", detail: "token must contain a signature separator" };
  }

  const payloadJson = decoded.slice(0, separatorIndex);
  const signatureHex = decoded.slice(separatorIndex + 1);
  if (!/^[A-Fa-f0-9]+$/.test(signatureHex) || signatureHex.length % 2 !== 0) {
    return { ok: false, code: "approval_malformed", detail: "token signature must be hex" };
  }

  const payloadBytes = Buffer.from(payloadJson, "utf8");
  const signature = Buffer.from(signatureHex, "hex");
  return { ok: true, payloadBytes, signature };
}

function decodeBase64Token(value: string): string | null {
  if (!/^[A-Za-z0-9+/=_-]+$/.test(value)) {
    return null;
  }

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function parsePayload(payloadBytes: Buffer): ParsedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadBytes.toString("utf8"));
  } catch {
    return { ok: false, code: "approval_malformed", detail: "payload is not valid JSON" };
  }

  if (!isRecord(parsed)) {
    return { ok: false, code: "approval_malformed", detail: "payload must be an object" };
  }

  if (
    typeof parsed.plan_id !== "string" ||
    typeof parsed.world_slug !== "string" ||
    typeof parsed.issued_at !== "string" ||
    typeof parsed.expires_at !== "string" ||
    !Array.isArray(parsed.patch_hashes) ||
    !parsed.patch_hashes.every((value) => typeof value === "string") ||
    Number.isNaN(Date.parse(parsed.expires_at))
  ) {
    return { ok: false, code: "approval_malformed", detail: "payload has invalid fields" };
  }

  return {
    ok: true,
    value: {
      plan_id: parsed.plan_id,
      world_slug: parsed.world_slug,
      patch_hashes: parsed.patch_hashes,
      issued_at: parsed.issued_at,
      expires_at: parsed.expires_at
    }
  };
}

function safeEqualDigest(expected: Buffer, supplied: Buffer): boolean {
  const expectedDigest = createHash("sha256").update(expected).digest();
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedDigest, suppliedDigest);
}

function sameStringArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
