import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { resolveRepoRoot } from "../db/path";

const SECRET_FILENAME = ".secret";
const SECRET_SIZE_BYTES = 32;
const DEFAULT_EXPIRY_MS = 5 * 60 * 1000;

export interface ApprovalTokenInput {
  plan_id: string;
  world_slug: string;
  patch_hashes: string[];
  issued_at?: string;
  expires_at?: string;
}

export interface ApprovalTokenPayload {
  plan_id: string;
  world_slug: string;
  patch_hashes: string[];
  issued_at: string;
  expires_at: string;
}

function resolveSecretPath(): string {
  return path.join(resolveRepoRoot(), "tools", "world-mcp", SECRET_FILENAME);
}

function serializePayload(payload: ApprovalTokenPayload): string {
  return JSON.stringify(payload);
}

function computeSignature(payload: ApprovalTokenPayload, secret: Buffer): Buffer {
  return createHmac("sha256", secret).update(serializePayload(payload), "utf8").digest();
}

function materializePayload(input: ApprovalTokenInput): ApprovalTokenPayload {
  const issuedAt = input.issued_at ?? new Date().toISOString();
  const expiresAt = input.expires_at ?? new Date(Date.parse(issuedAt) + DEFAULT_EXPIRY_MS).toISOString();

  if (Date.parse(expiresAt) < Date.parse(issuedAt)) {
    process.emitWarning(
      `Approval token expires before it is issued for plan ${input.plan_id}; engine-side expiry checks will reject it.`,
      {
        code: "WORLD_MCP_TOKEN_EXPIRES_IN_PAST"
      }
    );
  }

  return {
    plan_id: input.plan_id,
    world_slug: input.world_slug,
    patch_hashes: [...input.patch_hashes],
    issued_at: issuedAt,
    expires_at: expiresAt
  };
}

export function readOrCreateSecret(): Buffer {
  const secretPath = resolveSecretPath();

  if (existsSync(secretPath)) {
    return readFileSync(secretPath);
  }

  mkdirSync(path.dirname(secretPath), { recursive: true });
  const secret = randomBytes(SECRET_SIZE_BYTES);
  writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

export function signToken(input: ApprovalTokenInput, secret: Buffer): string {
  const payload = materializePayload(input);
  const signature = computeSignature(payload, secret).toString("hex");
  return Buffer.from(`${serializePayload(payload)}.${signature}`, "utf8").toString("base64");
}

export function parseToken(token: string): { payload: ApprovalTokenPayload; signature: Buffer } {
  const decoded = Buffer.from(token, "base64").toString("utf8");
  const separatorIndex = decoded.lastIndexOf(".");

  if (separatorIndex === -1) {
    throw new Error("Malformed approval token: missing signature separator.");
  }

  const payloadJson = decoded.slice(0, separatorIndex);
  const signatureHex = decoded.slice(separatorIndex + 1);

  return {
    payload: JSON.parse(payloadJson) as ApprovalTokenPayload,
    signature: Buffer.from(signatureHex, "hex")
  };
}
