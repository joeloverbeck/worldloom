import assert from "node:assert/strict";
import test from "node:test";

import type { BeatTemplate } from "../../src/schema/beat-template.js";
import { assembleWhySuggested } from "../../src/templates/why-suggested.js";

function fixtureTemplate(): BeatTemplate {
  return {
    id: "mtemplate-1",
    title: "Soft Confrontation",
    active: true,
    classification: {
      move_family: "confrontation",
      tags: ["hurt"],
      intensity: "general",
      tone_fit: ["tense"],
    },
    role_slots: {},
    requires: {
      record_classes_any: [],
      record_tags_any: [],
      relationship_axes_any: [],
      location_tags_any: [],
    },
    excludes: { record_tags_any: [], forbidden_if_secret_tags: [] },
    beat_guidance: [{ function: "setup", instruction: "x" }],
    forbidden_inventions: [],
    author_notes: "",
  };
}

test("assembleWhySuggested: all 7 dimensions matched returns top-4 by priority", () => {
  const lines = assembleWhySuggested({
    template: fixtureTemplate(),
    matches: {
      tagOverlap: ["relationship", "hurt", "guarded-truth"],
      roleSlotFit: ["initiator", "guarded_other"],
      locationMatch: ["park"],
      relationshipAxesMatch: ["trust"],
      requiredClassesPresent: ["beliefs"],
      intensityFit: true,
      intensityValue: "general",
      toneFitOverlap: ["tense"],
    },
  });
  assert.equal(lines.length, 4);
  assert.equal(lines[0], "relationship + hurt + guarded-truth");
  assert.equal(lines[1], "selected cast fits initiator/guarded_other");
  assert.equal(lines[2], "location: park");
  assert.equal(lines[3], "axes: trust");
});

test("assembleWhySuggested: tag overlap + role-slot returns 2 lines in priority order", () => {
  const lines = assembleWhySuggested({
    template: fixtureTemplate(),
    matches: {
      tagOverlap: ["hurt"],
      roleSlotFit: ["initiator"],
      locationMatch: [],
      relationshipAxesMatch: [],
      requiredClassesPresent: [],
      intensityFit: false,
      toneFitOverlap: [],
    },
  });
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "hurt");
  assert.equal(lines[1], "selected cast fits initiator");
});

test("assembleWhySuggested: no matches returns empty array", () => {
  const lines = assembleWhySuggested({
    template: fixtureTemplate(),
    matches: {
      tagOverlap: [],
      roleSlotFit: [],
      locationMatch: [],
      relationshipAxesMatch: [],
      requiredClassesPresent: [],
      intensityFit: false,
      toneFitOverlap: [],
    },
  });
  assert.equal(lines.length, 0);
});

test("assembleWhySuggested: deterministic — same input twice yields same array", () => {
  const args = {
    template: fixtureTemplate(),
    matches: {
      tagOverlap: ["hurt"],
      roleSlotFit: ["initiator"],
      locationMatch: ["park"],
      relationshipAxesMatch: [],
      requiredClassesPresent: [],
      intensityFit: false,
      toneFitOverlap: [],
    },
  };
  const a = assembleWhySuggested(args);
  const b = assembleWhySuggested(args);
  assert.deepEqual(a, b);
});

test("assembleWhySuggested: hard 4-line cap drops lowest-priority entries", () => {
  const lines = assembleWhySuggested({
    template: fixtureTemplate(),
    matches: {
      tagOverlap: ["hurt"],
      roleSlotFit: ["initiator"],
      locationMatch: ["park"],
      relationshipAxesMatch: ["trust"],
      requiredClassesPresent: ["beliefs"],
      intensityFit: true,
      intensityValue: "general",
      toneFitOverlap: ["tense"],
    },
  });
  assert.equal(lines.length, 4);
  assert.ok(!lines.some((l) => l.startsWith("intensity:")));
  assert.ok(!lines.some((l) => l.startsWith("tone:")));
  assert.ok(!lines.some((l) => l.startsWith("requires:")));
});

test("assembleWhySuggested: intensity skipped without intensityValue", () => {
  const lines = assembleWhySuggested({
    template: fixtureTemplate(),
    matches: {
      tagOverlap: [],
      roleSlotFit: [],
      locationMatch: [],
      relationshipAxesMatch: [],
      requiredClassesPresent: [],
      intensityFit: true,
      toneFitOverlap: [],
    },
  });
  assert.equal(lines.length, 0);
});
