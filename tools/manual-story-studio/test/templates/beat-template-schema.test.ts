import assert from "node:assert/strict";
import test from "node:test";

import type { BeatTemplate } from "../../src/schema/beat-template.js";
import { validateBeatTemplate } from "../../src/validate/beat-template-schema.js";

function validTemplate(): BeatTemplate {
  return {
    id: "mtemplate-1",
    title: "Soft Confrontation",
    active: true,
    classification: {
      move_family: "confrontation",
      tags: ["relationship", "hurt"],
      intensity: "general",
      tone_fit: ["tense", "tender"],
    },
    role_slots: {
      initiator: { compatible_roles: ["viewpoint", "primary_actor"] },
      guarded_other: { compatible_roles: ["opposing_actor"] },
    },
    requires: {
      record_classes_any: ["beliefs", "emotions"],
      record_tags_any: ["hurt"],
      relationship_axes_any: ["trust"],
      location_tags_any: ["semi-private"],
    },
    excludes: {
      record_tags_any: ["active-violence"],
      forbidden_if_secret_tags: ["must-not-reveal-yet"],
    },
    beat_guidance: [
      { function: "setup", instruction: "Set the room." },
      { function: "pressure", instruction: "Ask the question." },
      { function: "exit", instruction: "Allow retreat." },
    ],
    forbidden_inventions: ["new sibling"],
    author_notes: "Use sparingly.",
  };
}

test("validateBeatTemplate: valid fixture returns typed record", () => {
  const result = validateBeatTemplate(validTemplate());
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.record.id, "mtemplate-1");
    assert.equal(result.record.classification.move_family, "confrontation");
  }
});

test("validateBeatTemplate: missing id is rejected", () => {
  const broken: Record<string, unknown> = { ...validTemplate() };
  delete broken.id;
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.violations.some((v) => v.field === "id"));
  }
});

test("validateBeatTemplate: id pattern mismatch rejected (slug form)", () => {
  const broken = { ...validTemplate(), id: "mtemplate-soft-confrontation" };
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "id" && /pattern/.test(v.message),
      ),
    );
  }
});

test("validateBeatTemplate: beat_guidance length 0 rejected", () => {
  const broken = { ...validTemplate(), beat_guidance: [] };
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "beat_guidance" && /1-5/.test(v.message),
      ),
    );
  }
});

test("validateBeatTemplate: beat_guidance length 6 rejected", () => {
  const broken = {
    ...validTemplate(),
    beat_guidance: [
      { function: "setup", instruction: "a" },
      { function: "pressure", instruction: "b" },
      { function: "turn", instruction: "c" },
      { function: "exit", instruction: "d" },
      { function: "aftermath", instruction: "e" },
      { function: "setup", instruction: "f" },
    ],
  };
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "beat_guidance" && /1-5/.test(v.message),
      ),
    );
  }
});

test("validateBeatTemplate: move_family closed-enum violation rejected", () => {
  const broken = validTemplate();
  (broken.classification.move_family as unknown) = "argument";
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "classification.move_family",
      ),
    );
  }
});

test("validateBeatTemplate: tone_fit[0] closed-enum violation rejected", () => {
  const broken = validTemplate();
  (broken.classification.tone_fit as unknown[])[0] = "joyful";
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "classification.tone_fit[0]",
      ),
    );
  }
});

test("validateBeatTemplate: relationship_axes_any[0] closed-enum violation rejected", () => {
  const broken = validTemplate();
  (broken.requires.relationship_axes_any as unknown[])[0] = "loyalty";
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "requires.relationship_axes_any[0]",
      ),
    );
  }
});

test("validateBeatTemplate: beat_guidance[0].function closed-enum violation rejected", () => {
  const broken = validTemplate();
  (broken.beat_guidance[0]!.function as unknown) = "intro";
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "beat_guidance[0].function",
      ),
    );
  }
});

test("validateBeatTemplate: role_slots invalid compatible_role rejected", () => {
  const broken = validTemplate();
  (broken.role_slots["initiator"]!.compatible_roles as unknown[])[0] = "narrator";
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "role_slots.initiator.compatible_roles[0]",
      ),
    );
  }
});

test("validateBeatTemplate: root not object rejected", () => {
  const result = validateBeatTemplate("string-not-object");
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.violations.some((v) => v.field === "<root>"));
  }
});

test("validateBeatTemplate: unknown top-level field rejected", () => {
  const broken: Record<string, unknown> = { ...validTemplate(), extra: "x" };
  const result = validateBeatTemplate(broken);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(
      result.violations.some(
        (v) => v.field === "extra" && /unknown field/.test(v.message),
      ),
    );
  }
});
