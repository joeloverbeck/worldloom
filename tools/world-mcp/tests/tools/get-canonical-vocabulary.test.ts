import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_DOMAINS,
  CHANGE_TYPE_VALUES,
  ENTITY_KIND_VALUES,
  INVARIANT_CATEGORY_VALUES,
  MYSTERY_RESOLUTION_SAFETY_ENUM,
  MYSTERY_STATUS_ENUM,
  REVISION_DIFFICULTY_VALUES,
  SEC_FILE_CLASS_VALUES,
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

test("getCanonicalVocabulary returns invariant categories", async () => {
  const result = await getCanonicalVocabulary({ class: "invariant_category" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...INVARIANT_CATEGORY_VALUES]);
  assert.ok(result.canonical_values.includes("aesthetic_thematic"));
});

test("getCanonicalVocabulary returns ontology entity kinds", async () => {
  const result = await getCanonicalVocabulary({ class: "entity_kind" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...ENTITY_KIND_VALUES]);
  assert.ok(result.canonical_values.includes("magic_practice"));
  assert.ok(result.canonical_values.includes("metaphysical_rule"));
});

test("getCanonicalVocabulary returns section file classes", async () => {
  const result = await getCanonicalVocabulary({ class: "sec_file_class" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...SEC_FILE_CLASS_VALUES]);
  assert.ok(result.canonical_values.includes("PEOPLES_AND_SPECIES"));
});

test("getCanonicalVocabulary returns change types from the live schema contract", async () => {
  const result = await getCanonicalVocabulary({ class: "change_type" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...CHANGE_TYPE_VALUES]);
  assert.ok(result.canonical_values.includes("addition_with_qualification"));
  assert.ok(result.canonical_values.includes("de_canonization"));
});

test("getCanonicalVocabulary returns invariant revision difficulties", async () => {
  const result = await getCanonicalVocabulary({ class: "revision_difficulty" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...REVISION_DIFFICULTY_VALUES]);
});

test("getCanonicalVocabulary rejects unsupported vocabulary classes", async () => {
  const result = await getCanonicalVocabulary({ class: "not_real" as never });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.deepEqual(result.details?.supported_classes, [
    "domain",
    "verdict",
    "mystery_status",
    "mystery_resolution_safety",
    "invariant_category",
    "entity_kind",
    "sec_file_class",
    "change_type",
    "revision_difficulty"
  ]);
});
