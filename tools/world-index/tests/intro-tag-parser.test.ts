import assert from "node:assert/strict";
import test from "node:test";

import {
  MidstoryIntroductionTagError,
  extractIntroTags,
  parseIntroTag
} from "../src/parse/intro-tag-parser.js";

test("extractIntroTags parses valid intro tags for every mid-story class", () => {
  const cases = [
    ["CLK", "CLK-1", "deadline_declared"],
    ["STSEC", "STSEC-1", "clue_carrier_enters_play"],
    ["STQ", "STQ-1", "promise_made"],
    ["THR", "THR-1", "mission_line_opened"],
    ["STENT", "STENT-1", "actor_enters_branch"],
    ["SREL", "SREL-1", "trust_axis_becomes_relevant"]
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
