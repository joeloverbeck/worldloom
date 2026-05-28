import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  canonicalJsonStringify,
  computePgStateHash,
  computePlanHash,
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

test("computePgStateHash verifies both legacy and planless PG field-presence payloads", () => {
  const legacyPgRecord: Record<string, unknown> = {
    id: "PG-2",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: "PG-1",
    branch_path: ["PG-1", "PG-2"],
    turn_index: 1,
    input: {
      choice_id: "CHC-1",
      manual_action_text: null,
      resolved_event_id: "SE-2"
    },
    state_hash_parent: "0".repeat(64),
    state_snapshot: {
      active_records: {
        STCHAR: ["STCHAR-1"]
      }
    },
    plan: {
      plan_hash: "1".repeat(64)
    },
    prose_plan_path: "pages-prose-plans/PG-2.md",
    emitted_choices: ["CHC-2"],
    validation_trace: {
      input_legality: "PASS: choice CHC-1 resolves SE-2"
    },
    state_hash: "stale"
  };
  const legacyStateHash = computePgStateHash(legacyPgRecord);

  assert.equal(
    computePgStateHash({
      ...legacyPgRecord,
      state_hash: legacyStateHash
    }),
    legacyStateHash
  );

  const planlessPgRecord = { ...legacyPgRecord };
  delete planlessPgRecord.plan;
  delete planlessPgRecord.prose_plan_path;
  planlessPgRecord.state_hash = "stale";
  const planlessStateHash = computePgStateHash(planlessPgRecord);

  assert.equal(
    computePgStateHash({
      ...planlessPgRecord,
      state_hash: planlessStateHash
    }),
    planlessStateHash
  );
  assert.notEqual(planlessStateHash, legacyStateHash);
});

test("computePlanHash hashes the exact input bytes", () => {
  const bytes = Buffer.from("Plan body\n\nwith trailing newline\n", "utf8");

  assert.equal(computePlanHash(bytes), sha256Raw(bytes));
  assert.equal(computePlanHash(bytes.toString("utf8")), sha256Raw(bytes));
});
