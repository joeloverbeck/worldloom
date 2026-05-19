import assert from "node:assert/strict";
import test from "node:test";

import {
  MIDSTORY_TRIGGERS_STEMO,
  MIDSTORY_TRIGGERS_STPLAN,
  MidstoryIntroductionTagError,
  PLAN_RELATIONS,
  extractIntroTags,
  parseIntroTag,
  parsePlanRelationTags
} from "../src/parse/intro-tag-parser.js";

test("extractIntroTags parses valid intro tags for every mid-story class", () => {
  const cases = [
    ["CLK", "CLK-1", "deadline_declared"],
    ["STSEC", "STSEC-1", "clue_carrier_enters_play"],
    ["STQ", "STQ-1", "promise_made"],
    ["THR", "THR-1", "mission_line_opened"],
    ["STENT", "STENT-1", "actor_enters_branch"],
    ["SREL", "SREL-1", "trust_axis_becomes_relevant"],
    ["STPLAN", "STPLAN-1", "tactical_approach_committed"],
    ["STEMO", "STEMO-1", "event_revealed_truth_to_actor"]
  ] as const;

  for (const [recordClass, recordId, trigger] of cases) {
    assert.deepEqual(
      extractIntroTags(`intro:${recordClass}(id=${recordId}, trigger=${trigger}, evidence=[BEL-1,SF-2], distinct_from=[${recordId}])`),
      [
        {
          class: recordClass,
          recordId,
          trigger,
          evidence: ["BEL-1", "SF-2"],
          distinctFrom: [recordId]
        }
      ]
    );
  }
});

test("extractIntroTags parses every STPLAN and STEMO trigger", () => {
  for (const trigger of MIDSTORY_TRIGGERS_STPLAN) {
    assert.deepEqual(
      extractIntroTags(`intro:STPLAN(id=STPLAN-12, trigger=${trigger}, evidence=[BEL-1,STOBJ-8], distinct_from=[])`),
      [
        {
          class: "STPLAN",
          recordId: "STPLAN-12",
          trigger,
          evidence: ["BEL-1", "STOBJ-8"],
          distinctFrom: []
        }
      ]
    );
  }

  for (const trigger of MIDSTORY_TRIGGERS_STEMO) {
    assert.deepEqual(
      extractIntroTags(`intro:STEMO(id=STEMO-7, trigger=${trigger}, evidence=[BEL-31,SE-22], distinct_from=[])`),
      [
        {
          class: "STEMO",
          recordId: "STEMO-7",
          trigger,
          evidence: ["BEL-31", "SE-22"],
          distinctFrom: []
        }
      ]
    );
  }
});

test("parsePlanRelationTags parses closed plan relation tags in prose order", () => {
  const rationale = PLAN_RELATIONS
    .map((relation, index) => `plan_relation:${relation}(plan=STPLAN-${index + 1})`)
    .join("; ");

  assert.deepEqual(
    parsePlanRelationTags(rationale),
    PLAN_RELATIONS.map((relation, index) => ({
      relation,
      plan: `STPLAN-${index + 1}`
    }))
  );
});

test("parsePlanRelationTags coexists with intro and unrelated structured tags", () => {
  const rationale = [
    "intro:STPLAN(id=STPLAN-12, trigger=tactical_approach_committed, evidence=[BEL-1], distinct_from=[]).",
    " A secrecy rule applies: non_propagation:evidence_concealed(group=public, records=[BEL-1]).",
    " The accepted event advances the plan: plan_relation:advances(plan=STPLAN-12)."
  ].join("");

  assert.deepEqual(parsePlanRelationTags(rationale), [
    {
      relation: "advances",
      plan: "STPLAN-12"
    }
  ]);
  assert.deepEqual(extractIntroTags(rationale), [
    {
      class: "STPLAN",
      recordId: "STPLAN-12",
      trigger: "tactical_approach_committed",
      evidence: ["BEL-1"],
      distinctFrom: []
    }
  ]);
});

test("extractIntroTags parses multiple tags in prose order and ignores surrounding prose", () => {
  const rationale = [
    "The branch pressure now carries ",
    "intro:CLK(id=CLK-4, trigger=pursuit_started, evidence=[BEL-7], distinct_from=[]).",
    " The same event also creates ",
    "intro:STQ(id=STQ-9, trigger=explicit_question_raised, evidence=[CLK-4, BEL-8], distinct_from=[STQ-2])."
  ].join("");

  assert.deepEqual(extractIntroTags(rationale), [
    {
      class: "CLK",
      recordId: "CLK-4",
      trigger: "pursuit_started",
      evidence: ["BEL-7"],
      distinctFrom: []
    },
    {
      class: "STQ",
      recordId: "STQ-9",
      trigger: "explicit_question_raised",
      evidence: ["CLK-4", "BEL-8"],
      distinctFrom: ["STQ-2"]
    }
  ]);
});

test("parseIntroTag returns the first tag and tolerates whitespace inside fields", () => {
  assert.deepEqual(
    parseIntroTag("  intro:THR( id = THR-3, trigger = recovery_line_opened, evidence = [ CLK-1, BEL-2 ], distinct_from = [ THR-1 ] )  "),
    {
      class: "THR",
      recordId: "THR-3",
      trigger: "recovery_line_opened",
      evidence: ["CLK-1", "BEL-2"],
      distinctFrom: ["THR-1"]
    }
  );
});

test("extractIntroTags returns an empty array for empty rationale or prose without tags", () => {
  assert.deepEqual(extractIntroTags(""), []);
  assert.deepEqual(extractIntroTags("No structured introduction happens here."), []);
  assert.equal(parseIntroTag("No structured introduction happens here."), null);
});

test("extractIntroTags preserves strict parser errors for malformed intro tags", () => {
  const malformed = [
    "intro:CLK(id=CLK-1, trigger=deadline_declared, evidence=[], distinct_from=[]",
    "intro:BOGUS(id=BOGUS-1, trigger=deadline_declared, evidence=[], distinct_from=[])",
    "intro:CLK(id=clk-1, trigger=deadline_declared, evidence=[], distinct_from=[])",
    "intro:CLK(id=CLK-1, trigger=not_a_trigger, evidence=[], distinct_from=[])",
    "intro:CLK(id=CLK-1, trigger=deadline_declared, evidence=[bad-id], distinct_from=[])",
    "intro:CLK(id=CLK-1, trigger=deadline_declared, evidence=[], extra=[], distinct_from=[])"
  ];

  for (const rationale of malformed) {
    assert.throws(() => extractIntroTags(rationale), MidstoryIntroductionTagError);
  }
});

test("extractIntroTags rejects out-of-vocabulary STPLAN and STEMO triggers", () => {
  const malformed = [
    "intro:STPLAN(id=STPLAN-1, trigger=planned_resolution_reached, evidence=[], distinct_from=[])",
    "intro:STEMO(id=STEMO-1, trigger=emotional_arc_payoff, evidence=[], distinct_from=[])"
  ];

  for (const rationale of malformed) {
    assert.throws(() => extractIntroTags(rationale), MidstoryIntroductionTagError);
  }
});

test("parsePlanRelationTags rejects malformed or out-of-vocabulary plan relation tags", () => {
  const malformed = [
    "plan_relation:invalid_relation(plan=STPLAN-12)",
    "plan_relation:advances(plan=STEMO-12)",
    "plan_relation:advances(plan=STPLAN-01)",
    "plan_relation:advances(plan=STPLAN-12"
  ];

  for (const rationale of malformed) {
    assert.throws(() => parsePlanRelationTags(rationale), MidstoryIntroductionTagError);
  }
});
