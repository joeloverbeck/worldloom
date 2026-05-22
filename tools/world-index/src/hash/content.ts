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

// --- STCHAR content hashes (per story state contract §4.5.19) --------------
// Single source of truth for the three content-derived STCHAR hashes. They use
// the same prose-hash primitive as the world index content_hash
// (sha256Hex ∘ normalizeProseWhitespace, i.e. NFC + trailing-whitespace and
// leading/trailing-newline normalization) rather than a raw byte hash. This is
// deliberate: the patch engine may write a trailing newline the author did not
// emit, so a raw whole-body byte hash drifts between author-time and the
// on-disk artifact a later drift check reads. Normalizing makes the value
// stable across both. These return bare 64-hex digests; callers that write
// STCHAR frontmatter / page-plan §16a packets / prose receipts prefix the
// `sha256:` form the schema requires. The fourth STCHAR hash, source_char_hash,
// is NOT a content-derived hash: it must equal the world index content_hash of
// the source CHAR dossier (the value get_record(CHAR) returns, itself a
// sha256Hex ∘ normalizeProseWhitespace of the dossier body) so health-audit
// source_drift is meaningful, and is therefore taken from retrieval, not
// recomputed here.

// Mirrors the body extraction in stchar-body-integrity.ts: everything after the
// closing frontmatter `---`, with one leading newline stripped. Accepts either a
// full STCHAR file (frontmatter + body) or a body-only document.
export function extractStcharBodyMarkdown(fileContent: string): string {
  const lines = fileContent.split(/\r?\n/);
  if (lines[0] !== "---") {
    return fileContent;
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex <= 0) {
    return fileContent;
  }
  return lines.slice(closingIndex + 1).join("\n").replace(/^\n/, "");
}

// Mirrors the `## <name>` section slicing in stchar-body-integrity.ts: the text
// between the named H2 header and the next H2 (or end of body).
export function extractStcharSection(body: string, sectionName: string): string | null {
  const headings: Array<{ name: string; lineStart: number; contentStart: number }> = [];
  let lineStart = 0;

  while (lineStart <= body.length) {
    const newlineIndex = body.indexOf("\n", lineStart);
    const lineEnd = newlineIndex === -1 ? body.length : newlineIndex;
    const rawLine = body.slice(lineStart, lineEnd);
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

    if (line.startsWith("## ")) {
      const name = line.slice(3).trim();
      if (name.length > 0) {
        headings.push({
          name,
          lineStart,
          contentStart: lineEnd
        });
      }
    }

    if (newlineIndex === -1) {
      break;
    }
    lineStart = newlineIndex + 1;
  }

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    if (heading?.name === sectionName) {
      const end = headings[i + 1]?.lineStart ?? body.length;
      return body.slice(heading.contentStart, end);
    }
  }
  return null;
}

export function computeStcharProfileHash(fileOrBody: string): string {
  return sha256Hex(normalizeProseWhitespace(extractStcharBodyMarkdown(fileOrBody)));
}

export function computeStcharVoiceBlockHash(fileOrBody: string): string {
  const body = extractStcharBodyMarkdown(fileOrBody);
  const voiceBlock = extractStcharSection(body, "Page-Plan Voice Block");
  if (voiceBlock === null) {
    throw new Error("STCHAR body has no '## Page-Plan Voice Block' section to hash.");
  }
  return sha256Hex(normalizeProseWhitespace(voiceBlock));
}

const PAGE_PACKET_HASH_PLACEHOLDER = "sha256:<page_packet_hash>";
const PAGE_PACKET_HASH_FIELD_PATTERN = /page_packet_hash=sha256:[0-9a-f]{64}/g;

export function canonicalizeStcharPagePacketForHash(packetText: string): string {
  return packetText.replace(
    PAGE_PACKET_HASH_FIELD_PATTERN,
    `page_packet_hash=${PAGE_PACKET_HASH_PLACEHOLDER}`
  );
}

export function computeStcharPagePacketHash(packetText: string): string {
  return sha256Hex(normalizeProseWhitespace(canonicalizeStcharPagePacketForHash(packetText)));
}
