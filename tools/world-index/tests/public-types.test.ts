import assert from "node:assert/strict";
import test from "node:test";

import {
  ATOMIC_LOGICAL_WORLD_FILES,
  ATTRIBUTION_EDGE_TYPES,
  CURRENT_INDEX_VERSION,
  EDGE_TYPES,
  ENTITY_EDGE_TYPES,
  NODE_TYPES,
  SCOPED_EDGE_TYPES,
  YAML_EDGE_TYPES
} from "../src/public/types";
import {
  ARC_ARCHETYPES,
  CANONICAL_DOMAINS,
  COMMITMENT_CLASS_TO_FAMILY,
  COMMITMENT_CLASSES,
  COMMITMENT_FAMILIES,
  NARRATIVE_POINTS,
  STOP_PREDICATES,
  STRONG_AXES,
  STRONG_OUTCOMES,
  VERDICT_ENUM
} from "../src/public/canonical-vocabularies";
import type {
  AttributionEdgeType,
  CanonContradictionRisk,
  CanonDistribution,
  CanonFactRecord,
  CanonFactStatus,
  CanonScope,
  CanonScopeGeographic,
  CanonScopeSocial,
  CanonScopeTemporal,
  CanonSourceBasis,
  CanonTruthDiegeticStatus,
  CanonTruthScope,
  CanonTruthWorldLevel,
  ChangeLogEntry,
  ChangeLogScope,
  ChangeType,
  EdgeType,
  EntityEdgeType,
  ModificationHistoryEntry,
  NodeType,
  ScopedEdgeType,
  YamlEdgeType,
  ArcTraceNodeRow
} from "../src/public/types";
import { ATOMIC_LOGICAL_WORLD_FILES as SOURCE_ATOMIC_LOGICAL_WORLD_FILES } from "../src/parse/atomic";
import {
  ATTRIBUTION_EDGE_TYPES as SOURCE_ATTRIBUTION_EDGE_TYPES,
  EDGE_TYPES as SOURCE_EDGE_TYPES,
  ENTITY_EDGE_TYPES as SOURCE_ENTITY_EDGE_TYPES,
  NODE_TYPES as SOURCE_NODE_TYPES,
  SCOPED_EDGE_TYPES as SOURCE_SCOPED_EDGE_TYPES,
  YAML_EDGE_TYPES as SOURCE_YAML_EDGE_TYPES
} from "../src/schema/types";
import { CURRENT_INDEX_VERSION as SOURCE_SCHEMA_VERSION } from "../src/schema/version";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _NodeTypeMatchesTuple = Assert<IsEqual<NodeType, (typeof NODE_TYPES)[number]>>;
type _EdgeTypeMatchesTuple = Assert<IsEqual<EdgeType, (typeof EDGE_TYPES)[number]>>;
type _YamlEdgeTypeMatchesTuple = Assert<IsEqual<YamlEdgeType, (typeof YAML_EDGE_TYPES)[number]>>;
type _AttributionEdgeTypeMatchesTuple = Assert<
  IsEqual<AttributionEdgeType, (typeof ATTRIBUTION_EDGE_TYPES)[number]>
>;
type _EntityEdgeTypeMatchesTuple = Assert<
  IsEqual<EntityEdgeType, (typeof ENTITY_EDGE_TYPES)[number]>
>;
type _ScopedEdgeTypeMatchesTuple = Assert<
  IsEqual<ScopedEdgeType, (typeof SCOPED_EDGE_TYPES)[number]>
>;
type _CanonFactStatusIsString = Assert<CanonFactStatus extends string ? true : false>;
type _CanonScopeGeographicIsString = Assert<CanonScopeGeographic extends string ? true : false>;
type _CanonScopeTemporalIsString = Assert<CanonScopeTemporal extends string ? true : false>;
type _CanonScopeSocialIsString = Assert<CanonScopeSocial extends string ? true : false>;
type _CanonScopeShape = Assert<CanonScope extends { geographic: string } ? true : false>;
type _CanonTruthWorldLevel = Assert<CanonTruthWorldLevel extends boolean | "uncertain" ? true : false>;
type _CanonTruthDiegeticStatus = Assert<CanonTruthDiegeticStatus extends string ? true : false>;
type _CanonTruthScopeShape = Assert<CanonTruthScope extends { world_level: unknown } ? true : false>;
type _CanonDistributionShape = Assert<CanonDistribution extends object ? true : false>;
type _CanonSourceBasisShape = Assert<
  CanonSourceBasis extends { direct_user_approval: boolean } ? true : false
>;
type _CanonContradictionRiskShape = Assert<
  CanonContradictionRisk extends { hard: boolean; soft: boolean } ? true : false
>;
type _ModificationHistoryEntryShape = Assert<
  ModificationHistoryEntry extends { change_id: string } ? true : false
>;
type _CanonFactRecordShape = Assert<CanonFactRecord extends { id: string; title: string } ? true : false>;
type _ChangeTypeIsString = Assert<ChangeType extends string ? true : false>;
type _ChangeLogScopeShape = Assert<
  ChangeLogScope extends { local_or_global: "local" | "global" } ? true : false
>;
type _ChangeLogEntryShape = Assert<ChangeLogEntry extends { change_id: string } ? true : false>;
type _ArcTraceNodeRowShape = Assert<ArcTraceNodeRow extends { id: string; story_slug: string } ? true : false>;

test("public types re-export the expected runtime constants", () => {
  assert.deepEqual(ATOMIC_LOGICAL_WORLD_FILES, SOURCE_ATOMIC_LOGICAL_WORLD_FILES);
  assert.equal(CURRENT_INDEX_VERSION, SOURCE_SCHEMA_VERSION);
  assert.deepEqual(NODE_TYPES, SOURCE_NODE_TYPES);
  assert.deepEqual(EDGE_TYPES, SOURCE_EDGE_TYPES);
  assert.deepEqual(YAML_EDGE_TYPES, SOURCE_YAML_EDGE_TYPES);
  assert.deepEqual(ATTRIBUTION_EDGE_TYPES, SOURCE_ATTRIBUTION_EDGE_TYPES);
  assert.deepEqual(ENTITY_EDGE_TYPES, SOURCE_ENTITY_EDGE_TYPES);
  assert.deepEqual(SCOPED_EDGE_TYPES, SOURCE_SCOPED_EDGE_TYPES);
});

test("package self-import resolves without import-time IO", () => {
  const fs = require("node:fs");
  const originalStatSync = fs.statSync;

  fs.statSync = (...args: unknown[]) => {
    throw new Error(`io forbidden at import time: ${String(args[0])}`);
  };

  try {
    const publicTypes = require("@worldloom/world-index/public/types");
    const canonicalVocabularies = require("@worldloom/world-index/public/canonical-vocabularies");
    assert.equal(publicTypes.ATOMIC_LOGICAL_WORLD_FILES, ATOMIC_LOGICAL_WORLD_FILES);
    assert.equal(publicTypes.CURRENT_INDEX_VERSION, CURRENT_INDEX_VERSION);
    assert.equal(publicTypes.NODE_TYPES, NODE_TYPES);
    assert.equal(publicTypes.EDGE_TYPES, EDGE_TYPES);
    assert.equal(publicTypes.YAML_EDGE_TYPES, YAML_EDGE_TYPES);
    assert.equal(publicTypes.ATTRIBUTION_EDGE_TYPES, ATTRIBUTION_EDGE_TYPES);
    assert.equal(publicTypes.ENTITY_EDGE_TYPES, ENTITY_EDGE_TYPES);
    assert.equal(publicTypes.SCOPED_EDGE_TYPES, SCOPED_EDGE_TYPES);
    assert.equal(canonicalVocabularies.CANONICAL_DOMAINS, CANONICAL_DOMAINS);
    assert.equal(canonicalVocabularies.VERDICT_ENUM, VERDICT_ENUM);
    assert.equal(canonicalVocabularies.COMMITMENT_FAMILIES, COMMITMENT_FAMILIES);
    assert.equal(canonicalVocabularies.COMMITMENT_CLASSES, COMMITMENT_CLASSES);
    assert.equal(canonicalVocabularies.COMMITMENT_CLASS_TO_FAMILY, COMMITMENT_CLASS_TO_FAMILY);
    assert.equal(canonicalVocabularies.commitmentFamilyForClass("perform_false_identity"), "secrecy_deception");
    assert.equal(canonicalVocabularies.ARC_ARCHETYPES, ARC_ARCHETYPES);
    assert.equal(canonicalVocabularies.NARRATIVE_POINTS, NARRATIVE_POINTS);
    assert.equal(canonicalVocabularies.STRONG_AXES, STRONG_AXES);
    assert.equal(canonicalVocabularies.STRONG_OUTCOMES, STRONG_OUTCOMES);
    assert.equal(canonicalVocabularies.STOP_PREDICATES, STOP_PREDICATES);
  } finally {
    fs.statSync = originalStatSync;
  }
});

test("commitment taxonomy exposes families, expanded classes, and total class-family mapping", () => {
  const previousCommitmentClasses = [
    "stay_available_without_pressure",
    "offer_practical_help",
    "ask_one_bounded_question",
    "withdraw_without_abandoning",
    "confess_one_thing",
    "accept_offered_help",
    "refuse_with_grace",
    "escalate_to_confrontation",
    "conceal_under_pressure",
    "seek_third_party",
    "change_venue",
    "make_public_commitment",
    "private_betrayal",
    "bear_witness",
    "release_pressure",
    "tighten_pressure",
    "defer_decision",
    "force_disclosure",
    "mirror_acknowledgment",
    "intimacy_advance"
  ];

  assert.equal(COMMITMENT_FAMILIES.length, 16);
  assert.equal(COMMITMENT_CLASSES.length, 81);

  for (const value of previousCommitmentClasses) {
    assert.ok(COMMITMENT_CLASSES.includes(value as (typeof COMMITMENT_CLASSES)[number]));
  }

  assert.equal(new Set(COMMITMENT_CLASSES).size, COMMITMENT_CLASSES.length);
  assert.equal(new Set(COMMITMENT_FAMILIES).size, COMMITMENT_FAMILIES.length);
  assert.deepEqual(Object.keys(COMMITMENT_CLASS_TO_FAMILY).sort(), [...COMMITMENT_CLASSES].sort());

  for (const family of Object.values(COMMITMENT_CLASS_TO_FAMILY)) {
    assert.ok(COMMITMENT_FAMILIES.includes(family));
  }

  assert.equal(COMMITMENT_CLASS_TO_FAMILY.heal_or_tend, "care_help_protection");
  assert.equal(COMMITMENT_CLASS_TO_FAMILY.perform_false_identity, "secrecy_deception");
  assert.equal(COMMITMENT_CLASS_TO_FAMILY.conduct_ritual, "intimacy_performance_ritual");
});
