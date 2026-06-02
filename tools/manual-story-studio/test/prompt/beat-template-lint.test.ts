import assert from "node:assert/strict";
import test from "node:test";

import type { BeatTemplate } from "../../src/schema/beat-template.js";
import { lintBeatTemplateGuidance } from "../../src/prompt/lint.js";

function tpl(instruction: string): BeatTemplate {
  return {
    id: "mtemplate-1",
    title: "T",
    active: true,
    pressure_type: "discovery",
    turn_type: "discovery_turn",
    preconditions_text: "",
    do_not_resolve: [],
    expected_state_review: [],
    stop_after: "",
    anti_patterns: [],
    classification: {
      move_family: "observation",
      tags: [],
      intensity: "general",
      tone_fit: [],
    },
    role_slots: {},
    requires: {
      record_classes_any: [],
      record_tags_any: [],
      relationship_axes_any: [],
      location_tags_any: [],
    },
    excludes: { record_tags_any: [], forbidden_if_secret_tags: [] },
    beat_guidance: [{ function: "setup", instruction }],
    forbidden_inventions: [],
    author_notes: "",
  };
}

test("lintBeatTemplateGuidance: clean template → no findings", () => {
  const result = lintBeatTemplateGuidance(tpl("They walk into the park."));
  assert.equal(result.findings.length, 0);
  assert.equal(result.blockingForCopy, false);
  assert.equal(result.cleanForCopy, true);
});

test("lintBeatTemplateGuidance: engine record-id PG-2 triggers hard finding", () => {
  const result = lintBeatTemplateGuidance(
    tpl("advance PG-2 to next scene"),
  );
  assert.ok(
    result.findings.some(
      (f) => f.rule === "no_engine_jargon" && f.tier === "hard",
    ),
  );
});

test("lintBeatTemplateGuidance: internal id mchar-7 triggers hard finding", () => {
  const result = lintBeatTemplateGuidance(
    tpl("the actor in mchar-7 should respond"),
  );
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "no_internal_record_ids" &&
        f.tier === "hard" &&
        f.snippet === "mchar-7",
    ),
  );
});

test("lintBeatTemplateGuidance: schema/validator term triggers hard finding", () => {
  const result = lintBeatTemplateGuidance(tpl("use submit_patch_plan to save"));
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "no_schema_validator_terms" &&
        f.tier === "hard" &&
        f.snippet === "submit_patch_plan",
    ),
  );
});

test("lintBeatTemplateGuidance: narrator-voice phrase triggers hard finding", () => {
  const result = lintBeatTemplateGuidance(tpl("update the STCHAR profile here"));
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "no_record_class_narrator_voice" &&
        f.tier === "hard",
    ),
  );
});

test("lintBeatTemplateGuidance: leakage findings block copy", () => {
  // SPEC-106 retires the soft override path for prompt-leakage findings.
  const t = tpl("advance PG-2 with mchar-7 via submit_patch_plan");
  const result = lintBeatTemplateGuidance(t);
  assert.ok(result.findings.length > 0);
  assert.equal(result.blockingForCopy, true);
  assert.equal(result.cleanForCopy, false);
  for (const f of result.findings) {
    assert.equal(f.tier, "hard");
  }
});
