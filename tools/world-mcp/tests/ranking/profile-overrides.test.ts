import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE,
  canonFactsFromDiegeticArtifactsRankingProfile,
  canonAdditionRankingProfile,
  characterGenerationRankingProfile,
  continuityAuditRankingProfile,
  defaultRankingProfile,
  proposeNewCanonFactsRankingProfile,
  proposeNewCharactersRankingProfile,
  proposeNewWorldsFromPreferencesRankingProfile
} from "../../src/ranking/profiles";

test("canon_addition lifts canon-facing file class priorities above default", () => {
  assert.ok(
    (canonAdditionRankingProfile.file_class_priority.canon_fact_record ?? 0) >
      (defaultRankingProfile.file_class_priority.canon_fact_record ?? 0)
  );
  assert.ok(
    (canonAdditionRankingProfile.file_class_priority.change_log_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.change_log_entry ?? 0)
  );
  assert.ok(
    (canonAdditionRankingProfile.file_class_priority.mystery_reserve_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.mystery_reserve_entry ?? 0)
  );
});

test("character_generation boosts entity and firewall edges above default", () => {
  assert.ok((characterGenerationRankingProfile.edge_type_boost?.mentions_entity ?? 0) > 0);
  assert.ok((characterGenerationRankingProfile.edge_type_boost?.firewall_for ?? 0) > 0);
  assert.equal(defaultRankingProfile.edge_type_boost, undefined);
});

test("continuity_audit lifts recency and attribution trail weights above default", () => {
  assert.ok(
    continuityAuditRankingProfile.recency_of_modification_bonus >
      defaultRankingProfile.recency_of_modification_bonus
  );
  assert.ok((continuityAuditRankingProfile.edge_type_boost?.modified_by ?? 0) > 0);
  assert.ok((continuityAuditRankingProfile.edge_type_boost?.patched_by ?? 0) > 0);
});

test("canon-pipeline-adjacent task profiles do not reuse the other fallback", () => {
  const adjacentProfiles = [
    proposeNewCanonFactsRankingProfile,
    proposeNewCharactersRankingProfile,
    proposeNewWorldsFromPreferencesRankingProfile,
    canonFactsFromDiegeticArtifactsRankingProfile
  ];

  for (const profile of adjacentProfiles) {
    assert.notEqual(profile, defaultRankingProfile);
  }

  assert.ok(
    (proposeNewCanonFactsRankingProfile.file_class_priority.canon_fact_record ?? 0) >
      (defaultRankingProfile.file_class_priority.canon_fact_record ?? 0)
  );
  assert.ok(
    (proposeNewCharactersRankingProfile.file_class_priority.character_record ?? 0) >
      (defaultRankingProfile.file_class_priority.character_record ?? 0)
  );
  assert.ok(
    (proposeNewWorldsFromPreferencesRankingProfile.file_class_priority.domain_file ?? 0) >
      (defaultRankingProfile.file_class_priority.domain_file ?? 0)
  );
  assert.ok(
    (canonFactsFromDiegeticArtifactsRankingProfile.file_class_priority.diegetic_artifact_record ??
      0) >
      (defaultRankingProfile.file_class_priority.diegetic_artifact_record ?? 0)
  );
});

test("canon-pipeline-adjacent task types have task-specific default budgets", () => {
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.propose_new_canon_facts, 15000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.propose_new_characters, 15000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.propose_new_worlds_from_preferences, 12000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.canon_facts_from_diegetic_artifacts, 12000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.other, 8000);
});
