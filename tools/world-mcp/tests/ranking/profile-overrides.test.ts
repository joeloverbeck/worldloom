import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE,
  branchingStoryHealthAuditRankingProfile,
  canonFactsFromDiegeticArtifactsRankingProfile,
  canonAdditionRankingProfile,
  characterGenerationRankingProfile,
  continuityAuditRankingProfile,
  defaultRankingProfile,
  emergentPressureEventsRankingProfile,
  proposeNewCanonFactsRankingProfile,
  proposeNewCharactersRankingProfile,
  proposeNewWorldsFromPreferencesRankingProfile,
  storyBootstrapRankingProfile,
  storyCharacterProfileRankingProfile,
  storyFactPromotionToCanonRankingProfile,
  storyTurnCycleRankingProfile,
  commitmentBlockAuthoringRankingProfile
} from "../../src/ranking/profiles/index.js";

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
    canonFactsFromDiegeticArtifactsRankingProfile,
    emergentPressureEventsRankingProfile,
    storyBootstrapRankingProfile,
    storyCharacterProfileRankingProfile,
    storyTurnCycleRankingProfile,
    commitmentBlockAuthoringRankingProfile,
    branchingStoryHealthAuditRankingProfile,
    storyFactPromotionToCanonRankingProfile
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
  assert.ok(
    (emergentPressureEventsRankingProfile.file_class_priority.change_log_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.change_log_entry ?? 0)
  );
  assert.ok(
    (emergentPressureEventsRankingProfile.file_class_priority.mystery_reserve_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.mystery_reserve_entry ?? 0)
  );
  assert.ok((emergentPressureEventsRankingProfile.edge_type_boost?.pressures ?? 0) > 0);
  assert.ok(
    (storyBootstrapRankingProfile.file_class_priority.mystery_reserve_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.mystery_reserve_entry ?? 0)
  );
  assert.ok(
    (storyBootstrapRankingProfile.file_class_priority.invariant ?? 0) >
      (defaultRankingProfile.file_class_priority.invariant ?? 0)
  );
  assert.ok((storyBootstrapRankingProfile.edge_type_boost?.references_scoped_name ?? 0) > 0);
  assert.ok(
    (storyCharacterProfileRankingProfile.file_class_priority.character_record ?? 0) >
      (defaultRankingProfile.file_class_priority.character_record ?? 0)
  );
  assert.ok((storyCharacterProfileRankingProfile.edge_type_boost?.stchar_source_character ?? 0) > 0);
  assert.ok(
    (storyTurnCycleRankingProfile.file_class_priority.canon_fact_record ?? 0) >
      (defaultRankingProfile.file_class_priority.canon_fact_record ?? 0)
  );
  assert.ok(
    (storyTurnCycleRankingProfile.file_class_priority.invariant ?? 0) >
      (defaultRankingProfile.file_class_priority.invariant ?? 0)
  );
  assert.ok((storyTurnCycleRankingProfile.edge_type_boost?.mentions_entity ?? 0) > 0);
  assert.ok(
    (commitmentBlockAuthoringRankingProfile.file_class_priority.canon_fact_record ?? 0) >
      (defaultRankingProfile.file_class_priority.canon_fact_record ?? 0)
  );
  assert.ok(
    (commitmentBlockAuthoringRankingProfile.file_class_priority.mystery_reserve_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.mystery_reserve_entry ?? 0)
  );
  assert.ok((commitmentBlockAuthoringRankingProfile.edge_type_boost?.firewall_for ?? 0) > 0);
  assert.ok(
    (branchingStoryHealthAuditRankingProfile.file_class_priority.canon_fact_record ?? 0) >
      (defaultRankingProfile.file_class_priority.canon_fact_record ?? 0)
  );
  assert.ok(
    (branchingStoryHealthAuditRankingProfile.file_class_priority.change_log_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.change_log_entry ?? 0)
  );
  assert.ok(
    branchingStoryHealthAuditRankingProfile.recency_of_modification_bonus >
      defaultRankingProfile.recency_of_modification_bonus
  );
  assert.ok((branchingStoryHealthAuditRankingProfile.edge_type_boost?.firewall_for ?? 0) > 0);
  assert.ok(
    (storyFactPromotionToCanonRankingProfile.file_class_priority.canon_fact_record ?? 0) >
      (defaultRankingProfile.file_class_priority.canon_fact_record ?? 0)
  );
  assert.ok(
    (storyFactPromotionToCanonRankingProfile.file_class_priority.open_question_entry ?? 0) >
      (defaultRankingProfile.file_class_priority.open_question_entry ?? 0)
  );
  assert.ok((storyFactPromotionToCanonRankingProfile.edge_type_boost?.required_world_update ?? 0) > 0);
});

test("canon-pipeline-adjacent task types have task-specific default budgets", () => {
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.propose_new_canon_facts, 15000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.propose_new_characters, 15000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.propose_new_worlds_from_preferences, 12000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.canon_facts_from_diegetic_artifacts, 12000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.emergent_pressure_events, 15000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.story_bootstrap, 18000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.story_character_profile, 12000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.story_turn_cycle, 18000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.commitment_block_authoring, 18000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.branching_story_health_audit, 12000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.story_fact_promotion_to_canon, 8000);
  assert.equal(DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE.other, 8000);
});
