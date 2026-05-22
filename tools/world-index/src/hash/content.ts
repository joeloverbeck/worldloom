import { createHash } from "node:crypto";

import YAML from "yaml";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input.normalize("NFC"), "utf8").digest("hex");
}

export function normalizeProseWhitespace(body: string): string {
  const trimmedPerLine = body.replace(/[^\S\n]+$/gm, "");
  const collapsedNewlines = trimmedPerLine.replace(/\n{3,}/g, "\n\n");
  return collapsedNewlines.replace(/^\n+|\n+$/g, "");
}

export function serializeStableYaml(value: unknown): string {
  return YAML.stringify(value, {
    lineWidth: 0,
    sortMapEntries: true
  });
}

// Canonical-JSON serialization per the story state contract §4.2a: objects
// serialized with keys sorted lexicographically at every depth, arrays in
// authored order, strings emitted as UTF-8 JSON strings, no insignificant
// whitespace, no comments, no YAML anchors or aliases. Single source of truth
// for both PG hash computation (used by every story-pipeline skill that
// authors a PG record) and the validator's snapshot-drift comparison (used by
// snapshot_replay_equality.ts). Keep these in sync.

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256OfUtf8(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return createHash("sha256").update(buf).digest("hex");
}

// State-hash fork-state payload per story state contract §4.2a: include the
// complete PG mapping except state_hash (the field being computed). Rendered
// prose and prose receipts are publication artifacts, not PG fields.
const PG_STATE_HASH_EXCLUDED_FIELDS: ReadonlySet<string> = new Set([
  "state_hash"
]);

export function computePgStateHash(pgRecord: Record<string, unknown>): string {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pgRecord)) {
    if (PG_STATE_HASH_EXCLUDED_FIELDS.has(key)) {
      continue;
    }
    payload[key] = value;
  }
  return sha256OfUtf8(canonicalJsonStringify(payload));
}

export function computePlanHash(planBytes: string | Buffer): string {
  return sha256OfUtf8(planBytes);
}
