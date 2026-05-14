import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  canonicalJsonStringify,
  computePgStateHash,
  computePlanHash,
  sha256Hex,
  sha256OfUtf8
} from "../../src/hash/content";

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

test("computePgStateHash excludes state_hash and prose receipt fields but keeps all other fields", () => {
  const pgRecord = {
    id: "PG-2",
    story_id: "STORY-1",
    state_hash: "stale",
    prose_plan_path: "pages-prose-plans/PG-2.md",
    prose_path: "pages-prose/PG-2.md",
    prose_receipt_path: "pages-prose-receipts/PG-2.yaml",
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
      state_hash: "different",
      prose_path: "pages-prose/PG-2-revised.md",
      prose_receipt_path: null
    }),
    computePgStateHash(pgRecord)
  );
});

test("computePlanHash hashes the exact input bytes", () => {
  const bytes = Buffer.from("Plan body\n\nwith trailing newline\n", "utf8");

  assert.equal(computePlanHash(bytes), sha256Raw(bytes));
  assert.equal(computePlanHash(bytes.toString("utf8")), sha256Raw(bytes));
});
