import assert from "node:assert/strict";
import test from "node:test";

import {
  TASK_TYPES,
  defaultRankingProfile,
  getRankingProfile,
  rankingProfilesByTaskType
} from "../../src/ranking/profiles";

test("every spec task type resolves to a ranking profile", () => {
  for (const taskType of TASK_TYPES) {
    assert.equal(getRankingProfile(taskType), rankingProfilesByTaskType[taskType]);
  }
});

test("diegetic_artifact_generation and other intentionally reuse default", () => {
  assert.equal(getRankingProfile("diegetic_artifact_generation"), defaultRankingProfile);
  assert.equal(getRankingProfile("other"), defaultRankingProfile);
});

test("unknown task types fall back to default", () => {
  assert.equal(getRankingProfile("unknown-task-type"), defaultRankingProfile);
});
