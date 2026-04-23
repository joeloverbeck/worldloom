import assert from "node:assert/strict";
import test from "node:test";

import {
  canonAdditionRankingProfile,
  characterGenerationRankingProfile,
  continuityAuditRankingProfile,
  defaultRankingProfile
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
