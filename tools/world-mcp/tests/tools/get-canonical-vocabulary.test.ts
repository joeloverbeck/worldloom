import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_DOMAINS,
  MYSTERY_RESOLUTION_SAFETY_ENUM,
  MYSTERY_STATUS_ENUM,
  VERDICT_ENUM
} from "@worldloom/world-index/public/canonical-vocabularies";

import { getCanonicalVocabulary } from "../../src/tools/get-canonical-vocabulary";

test("getCanonicalVocabulary returns canonical domains from the shared module", async () => {
  const result = await getCanonicalVocabulary({ class: "domain" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...CANONICAL_DOMAINS]);
  assert.ok(result.canonical_values.includes("technology"));
});

test("getCanonicalVocabulary returns canonical adjudication verdicts", async () => {
  const result = await getCanonicalVocabulary({ class: "verdict" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...VERDICT_ENUM]);
  assert.equal(result.canonical_values.length, 6);
});

test("getCanonicalVocabulary returns canonical mystery statuses", async () => {
  const result = await getCanonicalVocabulary({ class: "mystery_status" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...MYSTERY_STATUS_ENUM]);
  assert.equal(result.canonical_values.length, 4);
});

test("getCanonicalVocabulary returns mystery resolution-safety coupling metadata", async () => {
  const result = await getCanonicalVocabulary({ class: "mystery_resolution_safety" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...MYSTERY_RESOLUTION_SAFETY_ENUM]);
  assert.deepEqual(result.coupling, {
    field: "status",
    rule: "forbidden allows only none; active, passive, and passive_depth allow low, medium, or high"
  });
});

test("getCanonicalVocabulary rejects unsupported vocabulary classes", async () => {
  const result = await getCanonicalVocabulary({ class: "not_real" as never });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.deepEqual(result.details?.supported_classes, [
    "domain",
    "verdict",
    "mystery_status",
    "mystery_resolution_safety"
  ]);
});
