import assert from "node:assert/strict";
import test from "node:test";

import { stemoOrientationRecordsExist } from "../../src/structural/stemo-orientation-records-exist.js";
import { baseRecords, context, emotion, hasCode, page, storyRecord } from "./stemo-helpers.js";

test("stemo_orientation_records_exist accepts known orientation records", async () => {
  const verdicts = await stemoOrientationRecordsExist.run(undefined, context(baseRecords([emotion()])));
  assert.deepEqual(verdicts, []);
});

test("stemo_orientation_records_exist rejects missing orientation records", async () => {
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([emotion({ orientation: { toward_records: ["STENT-404"] } })]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_exist.missing_orientation_record"));
});

test("stemo_orientation_records_exist rejects inactive orientation records", async () => {
  const inactiveTarget = storyRecord("story_entity_record", "STENT-3", "entities", {
    id: "STENT-3",
    created_at_page: "PG-1"
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([inactiveTarget, emotion({ orientation: { toward_records: ["STENT-3"] } })]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_active.inactive_target"));
});

test("stemo_orientation_records_exist rejects inaccessible orientation records", async () => {
  const inaccessibleTarget = storyRecord("story_entity_record", "STENT-3", "entities", {
    id: "STENT-3",
    created_at_page: "PG-1"
  });
  const targetStatus = storyRecord("story_status_record", "STSTAT-3", "status", {
    id: "STSTAT-3",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    entity: "STENT-3",
    life: "alive",
    agency: "free",
    location: "STLOC-2"
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([
      page("PG-2", {
        STENT: ["STENT-1", "STENT-2", "STENT-3"],
        STSTAT: ["STSTAT-1", "STSTAT-2", "STSTAT-3"],
        BEL: ["BEL-1"],
        SE: ["SE-1", "SE-2"],
        STEMO: ["STEMO-0"]
      }),
      inaccessibleTarget,
      targetStatus,
      emotion({ orientation: { toward_records: ["STENT-3"] } })
    ]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_active.inaccessible_target"));
});

test("stemo_orientation_records_exist accepts STSEC orientation for listed holders", async () => {
  const secret = storyRecord("story_secret_record", "STSEC-1", "secrets", {
    id: "STSEC-1",
    created_at_page: "PG-1",
    holders: ["STENT-1"],
    status: "hidden"
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([
      page("PG-2", {
        STENT: ["STENT-1", "STENT-2"],
        STSTAT: ["STSTAT-1", "STSTAT-2"],
        BEL: ["BEL-1"],
        SE: ["SE-1", "SE-2"],
        STSEC: ["STSEC-1"],
        STEMO: ["STEMO-0"]
      }),
      secret,
      emotion({ orientation: { toward_records: ["STSEC-1"] } })
    ]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_orientation_records_exist rejects hidden STSEC orientation for non-holders", async () => {
  const secret = storyRecord("story_secret_record", "STSEC-1", "secrets", {
    id: "STSEC-1",
    created_at_page: "PG-1",
    holders: ["STENT-2"],
    status: "hidden"
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([
      page("PG-2", {
        STENT: ["STENT-1", "STENT-2"],
        STSTAT: ["STSTAT-1", "STSTAT-2"],
        BEL: ["BEL-1"],
        SE: ["SE-1", "SE-2"],
        STSEC: ["STSEC-1"],
        STEMO: ["STEMO-0"]
      }),
      secret,
      emotion({ orientation: { toward_records: ["STSEC-1"] } })
    ]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_active.inaccessible_target"));
});

test("stemo_orientation_records_exist accepts branch-public THR and CNSQ targets", async () => {
  const thread = storyRecord("thread_record", "THR-1", "threads", { id: "THR-1", created_at_page: "PG-1" });
  const consequence = storyRecord("consequence_record", "CNSQ-1", "consequences", { id: "CNSQ-1", created_at_page: "PG-1" });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([
      page("PG-2", {
        STENT: ["STENT-1", "STENT-2"],
        STSTAT: ["STSTAT-1", "STSTAT-2"],
        BEL: ["BEL-1"],
        SE: ["SE-1", "SE-2"],
        THR: ["THR-1"],
        CNSQ: ["CNSQ-1"],
        STEMO: ["STEMO-0"]
      }),
      thread,
      consequence,
      emotion({ orientation: { toward_records: ["THR-1", "CNSQ-1"] } })
    ]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_orientation_records_exist gates STQ orientation by audience visibility", async () => {
  const visibleQuestion = storyRecord("story_question_record", "STQ-1", "story-questions", {
    id: "STQ-1",
    created_at_page: "PG-1",
    audience_visibility: "explicit"
  });
  const hiddenQuestion = storyRecord("story_question_record", "STQ-2", "story-questions", {
    id: "STQ-2",
    created_at_page: "PG-1",
    audience_visibility: "hidden"
  });

  const visibleVerdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([
      page("PG-2", {
        STENT: ["STENT-1", "STENT-2"],
        STSTAT: ["STSTAT-1", "STSTAT-2"],
        BEL: ["BEL-1"],
        SE: ["SE-1", "SE-2"],
        STQ: ["STQ-1"],
        STEMO: ["STEMO-0"]
      }),
      visibleQuestion,
      emotion({ orientation: { toward_records: ["STQ-1"] } })
    ]))
  );
  assert.deepEqual(visibleVerdicts, []);

  const hiddenVerdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([
      page("PG-2", {
        STENT: ["STENT-1", "STENT-2"],
        STSTAT: ["STSTAT-1", "STSTAT-2"],
        BEL: ["BEL-1"],
        SE: ["SE-1", "SE-2"],
        STQ: ["STQ-2"],
        STEMO: ["STEMO-0"]
      }),
      hiddenQuestion,
      emotion({ orientation: { toward_records: ["STQ-2"] } })
    ]))
  );
  assert.ok(hasCode(hiddenVerdicts, "stemo_orientation_records_active.inaccessible_target"));
});

test("stemo_orientation_records_exist allows accessible false BEL imagined-object targets without active listing", async () => {
  const imaginedBelief = storyRecord("belief_record", "BEL-5", "beliefs", {
    id: "BEL-5",
    created_at_page: "PG-1",
    holder: "STENT-1",
    truth_relation: "false",
    basis: { access_records: ["STENT-1"] }
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([imaginedBelief, emotion({ orientation: { toward_records: ["BEL-5"] } })]))
  );
  assert.deepEqual(verdicts, []);
});

test("stemo_orientation_records_exist rejects inaccessible false BEL imagined-object targets", async () => {
  const inaccessibleBelief = storyRecord("belief_record", "BEL-5", "beliefs", {
    id: "BEL-5",
    created_at_page: "PG-1",
    holder: "STENT-2",
    truth_relation: "false",
    basis: { access_records: ["STENT-2"] }
  });
  const verdicts = await stemoOrientationRecordsExist.run(
    undefined,
    context(baseRecords([inaccessibleBelief, emotion({ orientation: { toward_records: ["BEL-5"] } })]))
  );
  assert.ok(hasCode(verdicts, "stemo_orientation_records_active.inaccessible_target"));
  assert.ok(!hasCode(verdicts, "stemo_orientation_records_active.inactive_target"));
});
