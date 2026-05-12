import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ARC_ARCHETYPES,
  CANONICAL_DOMAINS,
  CF_TYPE_EPISTEMIC_PROFILE_REQUIRED,
  CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED,
  CF_TYPE_VALUES,
  CHANGE_TYPE_VALUES,
  COMMITMENT_CLASS_TO_FAMILY,
  COMMITMENT_CLASSES,
  COMMITMENT_FAMILIES,
  ENTITY_KIND_VALUES,
  INVARIANT_CATEGORY_VALUES,
  MYSTERY_RESOLUTION_SAFETY_ENUM,
  MYSTERY_STATUS_ENUM,
  NARRATIVE_POINTS,
  REVISION_DIFFICULTY_VALUES,
  SEC_FILE_CLASS_VALUES,
  STOP_PREDICATES,
  STRONG_AXES,
  STRONG_OUTCOMES,
  VERDICT_ENUM
} from "@worldloom/world-index/public/canonical-vocabularies";

import { getCanonicalVocabulary } from "../../src/tools/get-canonical-vocabulary";

function changeLogMysteryReserveEffectEnum(): string[] {
  const schemaPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "tools",
    "validators",
    "src",
    "schemas",
    "change-log-entry.schema.json"
  );
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
    properties?: {
      scope?: {
        properties?: {
          mystery_reserve_effect?: {
            enum?: unknown[];
          };
        };
      };
    };
  };

  const values = schema.properties?.scope?.properties?.mystery_reserve_effect?.enum;
  assert.ok(Array.isArray(values));
  assert.ok(values.every((value): value is string => typeof value === "string"));
  return values;
}

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

test("getCanonicalVocabulary returns mystery reserve effects from the change-log schema contract", async () => {
  const result = await getCanonicalVocabulary({ class: "mystery_reserve_effect" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, changeLogMysteryReserveEffectEnum());
  assert.deepEqual(result.canonical_values, [
    "unchanged",
    "expands",
    "narrows",
    "narrows_via_firewalls_and_expands_via_new_entries"
  ]);
});

test("getCanonicalVocabulary returns invariant revision difficulties", async () => {
  const result = await getCanonicalVocabulary({ class: "revision_difficulty" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...REVISION_DIFFICULTY_VALUES]);
});

test("getCanonicalVocabulary returns canon fact types and conditional block coupling", async () => {
  const result = await getCanonicalVocabulary({ class: "cf_type" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.canonical_values, [...CF_TYPE_VALUES]);
  assert.ok(result.canonical_values.includes("institution_with_secrecy"));
  assert.ok(result.canonical_values.includes("knowledge_asymmetric_fact"));
  assert.deepEqual(result.coupling, {
    field: "type",
    rule: "Types in CF_TYPE_EPISTEMIC_PROFILE_REQUIRED require populated epistemic_profile. Types in CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED additionally require populated exception_governance. Validator: record_schema_compliance."
  });

  const byValue = new Map(result.per_value_coupling?.map((entry) => [entry.value, entry]) ?? []);
  assert.equal(byValue.get("institution_with_secrecy")?.requires_epistemic_profile, true);
  assert.equal(byValue.get("institution_with_secrecy")?.requires_exception_governance, false);
  assert.equal(byValue.get("capability")?.requires_epistemic_profile, true);
  assert.equal(byValue.get("capability")?.requires_exception_governance, true);
  assert.deepEqual(
    new Set(
      result.per_value_coupling
        ?.filter((entry) => entry.requires_epistemic_profile)
        .map((entry) => entry.value)
    ),
    new Set(CF_TYPE_EPISTEMIC_PROFILE_REQUIRED)
  );
  assert.deepEqual(
    new Set(
      result.per_value_coupling
        ?.filter((entry) => entry.requires_exception_governance)
        .map((entry) => entry.value)
    ),
    new Set(CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED)
  );
});

test("getCanonicalVocabulary returns scene-commitment taxonomy and arc vocabularies", async () => {
  const expected = [
    { class: "commitment_family", values: COMMITMENT_FAMILIES, length: 16 },
    { class: "commitment_class", values: COMMITMENT_CLASSES, length: 81 },
    { class: "arc_archetype", values: ARC_ARCHETYPES, length: 20 },
    { class: "narrative_point", values: NARRATIVE_POINTS, length: 5 },
    { class: "strong_axis", values: STRONG_AXES, length: 8 },
    { class: "strong_outcome", values: STRONG_OUTCOMES, length: 8 },
    { class: "stop_predicate", values: STOP_PREDICATES, length: 19 }
  ] as const;

  for (const vocabulary of expected) {
    const result = await getCanonicalVocabulary({ class: vocabulary.class });

    assert.ok(!("code" in result));
    assert.deepEqual(result.canonical_values, [...vocabulary.values]);
    assert.equal(result.canonical_values.length, vocabulary.length);
  }

  const classes = await getCanonicalVocabulary({ class: "commitment_class" });
  assert.ok(!("code" in classes));
  assert.deepEqual(classes.coupling, {
    field: "commitment_family",
    rule: "Every closed commitment_class maps to exactly one closed commitment_family. Future commitment_detail values are open story-specific labels and are not part of this vocabulary."
  });
  assert.deepEqual(
    classes.per_value_family,
    COMMITMENT_CLASSES.map((value) => ({ value, family: COMMITMENT_CLASS_TO_FAMILY[value] }))
  );
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
    "mystery_reserve_effect",
    "revision_difficulty",
    "cf_type",
    "commitment_family",
    "commitment_class",
    "arc_archetype",
    "narrative_point",
    "strong_axis",
    "strong_outcome",
    "stop_predicate"
  ]);
});
