import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  canonicalizeStcharPagePacketForHash,
  canonicalJsonStringify,
  computePgStateHash,
  computePlanHash,
  computeStcharPagePacketHash,
  computeStcharProfileHash,
  computeStcharVoiceBlockHash,
  extractStcharBodyMarkdown,
  extractStcharSection,
  normalizeProseWhitespace,
  sha256Hex,
  sha256OfUtf8
} from "../../src/hash/content.js";

function sha256Raw(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

test("canonicalJsonStringify sorts object keys recursively without reordering arrays", () => {
  const value = {
    z: 1,
    a: {
      beta: true,
      alpha: null
    },
    list: [{ y: "kept", x: "sorted" }, ["b", "a"]]
  };

  assert.equal(
    canonicalJsonStringify(value),
    '{"a":{"alpha":null,"beta":true},"list":[{"x":"sorted","y":"kept"},["b","a"]],"z":1}'
  );
});

test("canonicalJsonStringify uses JavaScript code-unit ordering rather than locale ordering", () => {
  assert.equal(
    canonicalJsonStringify({ ä: "umlaut", z: "zed", a: "aye" }),
    '{"a":"aye","z":"zed","ä":"umlaut"}'
  );
});

test("sha256OfUtf8 hashes raw UTF-8 and does not NFC-normalize like sha256Hex", () => {
  const decomposed = "e\u0301";
  const rawHash = sha256Raw(Buffer.from(decomposed, "utf8"));

  assert.equal(sha256OfUtf8(decomposed), rawHash);
  assert.equal(sha256OfUtf8(Buffer.from(decomposed, "utf8")), rawHash);
  assert.notEqual(sha256OfUtf8(decomposed), sha256Hex(decomposed));
});

test("computePgStateHash excludes state_hash but keeps all other PG fields", () => {
  const pgRecord = {
    id: "PG-2",
    story_id: "STORY-1",
    state_hash: "stale",
    prose_plan_path: "pages-prose-plans/PG-2.md",
    plan: {
      plan_hash: "abc123"
    },
    validation_trace: {
      branch_isolation: "PASS: checked",
      input_legality: "PASS: checked"
    }
  };

  const expectedPayload = {
    id: "PG-2",
    plan: {
      plan_hash: "abc123"
    },
    prose_plan_path: "pages-prose-plans/PG-2.md",
    story_id: "STORY-1",
    validation_trace: {
      branch_isolation: "PASS: checked",
      input_legality: "PASS: checked"
    }
  };

  assert.equal(
    computePgStateHash(pgRecord),
    sha256OfUtf8(canonicalJsonStringify(expectedPayload))
  );

  assert.equal(
    computePgStateHash({
      ...pgRecord,
      state_hash: "different"
    }),
    computePgStateHash(pgRecord)
  );

  assert.notEqual(
    computePgStateHash({
      ...pgRecord,
      retired_field: "changes the payload"
    }),
    computePgStateHash(pgRecord)
  );
});

test("computePlanHash hashes the exact input bytes", () => {
  const bytes = Buffer.from("Plan body\n\nwith trailing newline\n", "utf8");

  assert.equal(computePlanHash(bytes), sha256Raw(bytes));
  assert.equal(computePlanHash(bytes.toString("utf8")), sha256Raw(bytes));
});

const STCHAR_BODY = [
  "# Jon",
  "",
  "## Story-Facing Identity",
  "",
  "He is the viewpoint.",
  "",
  "## Page-Plan Voice Block",
  "",
  "First-person, deep close; clipped aloud, flooded within.",
  "",
  "## Validation / Audit Anchors",
  "",
  "Source: CHAR-5.",
  ""
].join("\n");

test("extractStcharBodyMarkdown returns the body after frontmatter and is body-only stable", () => {
  const full = `---\nid: STCHAR-1\nstatus: active\n---\n${STCHAR_BODY}`;
  // A full file (frontmatter + body) and the body-only document extract identically.
  assert.equal(extractStcharBodyMarkdown(full), STCHAR_BODY);
  assert.equal(extractStcharBodyMarkdown(STCHAR_BODY), STCHAR_BODY);
  assert.equal(computeStcharProfileHash(full), computeStcharProfileHash(STCHAR_BODY));
});

test("computeStcharProfileHash is the normalized-prose sha256 of the body markdown", () => {
  assert.equal(
    computeStcharProfileHash(STCHAR_BODY),
    sha256Hex(normalizeProseWhitespace(STCHAR_BODY))
  );
});

test("computeStcharProfileHash is stable across a trailing-newline the engine may add", () => {
  // The patch engine can write a trailing newline the author did not emit; the
  // normalized hash must be invariant to it so author-time and on-disk recompute agree.
  assert.equal(computeStcharProfileHash(STCHAR_BODY), computeStcharProfileHash(`${STCHAR_BODY}\n`));
  assert.equal(computeStcharProfileHash(STCHAR_BODY), computeStcharProfileHash(`${STCHAR_BODY}\n\n`));
  // And a raw byte hash would NOT have this property — proving why normalization is required.
  assert.notEqual(sha256Raw(Buffer.from(STCHAR_BODY, "utf8")), sha256Raw(Buffer.from(`${STCHAR_BODY}\n`, "utf8")));
});

test("computeStcharVoiceBlockHash hashes only the Page-Plan Voice Block section", () => {
  const section = extractStcharSection(STCHAR_BODY, "Page-Plan Voice Block");
  assert.ok(section !== null);
  assert.equal(
    computeStcharVoiceBlockHash(STCHAR_BODY),
    sha256Hex(normalizeProseWhitespace(section as string))
  );
});

test("computeStcharVoiceBlockHash throws when the section is absent", () => {
  assert.throws(() => computeStcharVoiceBlockHash("# X\n\n## Other\n\nnope\n"), /Page-Plan Voice Block/);
});

test("canonicalizeStcharPagePacketForHash masks only the self-referential page_packet_hash value", () => {
  const packet = [
    "- STENT-1 / STCHAR-1 - Example.",
    "  - Required because: speaker.",
    `  - Hashes: profile_hash=sha256:${"a".repeat(64)}; voice_block_hash=sha256:${"b".repeat(64)}; page_packet_hash=sha256:${"c".repeat(64)}.`,
    "  - Voice/dialogue authority: clipped.",
    ""
  ].join("\n");

  assert.equal(
    canonicalizeStcharPagePacketForHash(packet),
    [
      "- STENT-1 / STCHAR-1 - Example.",
      "  - Required because: speaker.",
      `  - Hashes: profile_hash=sha256:${"a".repeat(64)}; voice_block_hash=sha256:${"b".repeat(64)}; page_packet_hash=sha256:<page_packet_hash>.`,
      "  - Voice/dialogue authority: clipped.",
      ""
    ].join("\n")
  );
});

test("computeStcharPagePacketHash is stable when only its stored page hash changes", () => {
  const packet = [
    "- STENT-1 / STCHAR-1 - Example.",
    "  - Required because: speaker.",
    `  - Hashes: profile_hash=sha256:${"a".repeat(64)}; voice_block_hash=sha256:${"b".repeat(64)}; page_packet_hash=sha256:${"c".repeat(64)}.`,
    "  - Voice/dialogue authority: clipped.",
    ""
  ].join("\n");
  const restampedPacket = packet.replace(`sha256:${"c".repeat(64)}`, `sha256:${"d".repeat(64)}`);

  assert.equal(computeStcharPagePacketHash(packet), computeStcharPagePacketHash(restampedPacket));
});

test("computeStcharPagePacketHash still changes when non-self packet authority changes", () => {
  const packet = [
    "- STENT-1 / STCHAR-1 - Example.",
    "  - Required because: speaker.",
    `  - Hashes: profile_hash=sha256:${"a".repeat(64)}; voice_block_hash=sha256:${"b".repeat(64)}; page_packet_hash=sha256:${"c".repeat(64)}.`,
    "  - Voice/dialogue authority: clipped.",
    ""
  ].join("\n");
  const changedProfileHashPacket = packet.replace(`sha256:${"a".repeat(64)}`, `sha256:${"e".repeat(64)}`);

  assert.notEqual(computeStcharPagePacketHash(packet), computeStcharPagePacketHash(changedProfileHashPacket));
  assert.equal(
    computeStcharPagePacketHash(packet),
    sha256Hex(normalizeProseWhitespace(canonicalizeStcharPagePacketForHash(packet)))
  );
});
