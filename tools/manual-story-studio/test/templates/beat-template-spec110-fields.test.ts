import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { BeatTemplate } from "../../src/schema/beat-template.js";
import type {
  ManualStoryContract,
  ManualStoryPromptPolicy,
} from "../../src/schema/manual-story.js";
import {
  filterBeatTemplates,
  type FilterInput,
} from "../../src/templates/filter.js";
import { assembleWhySuggested } from "../../src/templates/why-suggested.js";
import { validateBeatTemplate } from "../../src/validate/beat-template-schema.js";

function validTemplate(overrides: Partial<BeatTemplate> = {}): BeatTemplate {
  return {
    id: "mtemplate-1",
    title: "Soft Confrontation",
    active: true,
    pressure_type: "intimacy",
    turn_type: "escalation",
    preconditions_text: "A relationship wound is already active.",
    do_not_resolve: [],
    expected_state_review: ["relationships"],
    stop_after: "",
    anti_patterns: [],
    classification: {
      move_family: "confrontation",
      tags: ["relationship"],
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
    excludes: {
      record_tags_any: [],
      forbidden_if_secret_tags: [],
    },
    beat_guidance: [
      { function: "setup", instruction: "Set the room." },
      { function: "pressure", instruction: "Ask the question." },
    ],
    forbidden_inventions: [],
    author_notes: "",
    ...overrides,
  };
}

function defaultContract(): ManualStoryContract {
  return {
    premise: "",
    tone: "",
    pov: "close third",
    tense: "past",
    content_intensity: "general",
    explicitness: "",
    language_register: "mixed",
    prose_preferences: {
      psychic_distance: "variable",
      dialogue_density: "mixed",
      interiority: "mixed",
      paragraphing: "mixed",
    },
  };
}

function defaultPromptPolicy(): ManualStoryPromptPolicy {
  return {
    save_prompts: true,
    require_moment_directive: true,
    default_beat_count: "2-5",
    include_recent_segments: 1,
    recent_template_advisory_window: 2,
  };
}

function makeInput(overrides: Partial<FilterInput> = {}): FilterInput {
  const manualStoryRoot = mkdtempSync(path.join(os.tmpdir(), "spec110-filter-"));
  return {
    storyContract: defaultContract(),
    promptPolicy: defaultPromptPolicy(),
    selectedCast: [],
    activeRecords: [],
    activeSecrets: [],
    activeLocations: [],
    segmentOrder: [],
    optionalAuthorPins: {},
    allTemplates: [],
    ...overrides,
    manualStoryRoot,
  };
}

test("SPEC-110 fields: validator rejects invalid pressure and turn enums", () => {
  const invalidPressure = validateBeatTemplate({
    ...validTemplate(),
    pressure_type: "trust_test",
  });
  assert.equal(invalidPressure.valid, false);
  if (!invalidPressure.valid) {
    assert.ok(
      invalidPressure.violations.some(
        (v) =>
          v.field === "pressure_type" && /not in allowed set/.test(v.message),
      ),
    );
  }

  const invalidTurn = validateBeatTemplate({
    ...validTemplate(),
    turn_type: "reluctant_concession",
  });
  assert.equal(invalidTurn.valid, false);
  if (!invalidTurn.valid) {
    assert.ok(
      invalidTurn.violations.some(
        (v) => v.field === "turn_type" && /not in allowed set/.test(v.message),
      ),
    );
  }
});

test("SPEC-110 fields: validator rejects unknown and template-only state-review classes distinctly", () => {
  const unknownClass = validateBeatTemplate({
    ...validTemplate(),
    expected_state_review: ["memories"],
  });
  assert.equal(unknownClass.valid, false);
  if (!unknownClass.valid) {
    assert.ok(
      unknownClass.violations.some(
        (v) =>
          v.field === "expected_state_review[0]" &&
          /not in allowed set/.test(v.message),
      ),
    );
  }

  const templateClass = validateBeatTemplate({
    ...validTemplate(),
    expected_state_review: ["beat-templates"],
  });
  assert.equal(templateClass.valid, false);
  if (!templateClass.valid) {
    assert.ok(
      templateClass.violations.some(
        (v) =>
          v.field === "expected_state_review[0]" &&
          /not a state-review class/.test(v.message),
      ),
    );
    assert.ok(
      !templateClass.violations.some(
        (v) =>
          v.field === "expected_state_review[0]" &&
          /not in allowed set/.test(v.message),
      ),
    );
  }
});

test("SPEC-110 fields: desired pressure pin is a deterministic tie-breaker", () => {
  const nonMatch = validTemplate({
    id: "mtemplate-10",
    title: "A Nonmatching Pressure",
    pressure_type: "choice",
  });
  const match = validTemplate({
    id: "mtemplate-11",
    title: "Z Matching Pressure",
    pressure_type: "intimacy",
  });
  const input = makeInput({
    optionalAuthorPins: { desiredPressureType: "intimacy" },
    allTemplates: [nonMatch, match],
  });
  try {
    const result = filterBeatTemplates(input);
    assert.deepEqual(
      result.map((candidate) => candidate.template.id),
      ["mtemplate-11", "mtemplate-10"],
    );
    assert.ok(result[0]!.why_suggested.includes("pressure: intimacy"));
  } finally {
    rmSync(input.manualStoryRoot, { recursive: true, force: true });
  }
});

test("SPEC-110 fields: absent desired pressure pin preserves title fallback order", () => {
  const nonMatch = validTemplate({
    id: "mtemplate-10",
    title: "A Nonmatching Pressure",
    pressure_type: "choice",
  });
  const match = validTemplate({
    id: "mtemplate-11",
    title: "Z Matching Pressure",
    pressure_type: "intimacy",
  });
  const input = makeInput({
    allTemplates: [nonMatch, match],
  });
  try {
    const result = filterBeatTemplates(input);
    assert.deepEqual(
      result.map((candidate) => candidate.template.id),
      ["mtemplate-10", "mtemplate-11"],
    );
    assert.ok(
      !result.some((candidate) =>
        candidate.why_suggested.includes("pressure: intimacy"),
      ),
    );
  } finally {
    rmSync(input.manualStoryRoot, { recursive: true, force: true });
  }
});

test("SPEC-110 fields: why-suggested pressure line appears only on a pressure match", () => {
  const template = validTemplate();
  const matched = assembleWhySuggested({
    template,
    matches: {
      tagOverlap: [],
      roleSlotFit: [],
      locationMatch: [],
      relationshipAxesMatch: [],
      requiredClassesPresent: [],
      intensityFit: false,
      pressureTypeMatch: true,
      pressureTypeValue: "intimacy",
      toneFitOverlap: [],
    },
  });
  assert.deepEqual(matched, ["pressure: intimacy"]);

  const unmatched = assembleWhySuggested({
    template,
    matches: {
      tagOverlap: [],
      roleSlotFit: [],
      locationMatch: [],
      relationshipAxesMatch: [],
      requiredClassesPresent: [],
      intensityFit: false,
      pressureTypeMatch: false,
      toneFitOverlap: [],
    },
  });
  assert.equal(unmatched.includes("pressure: intimacy"), false);
});
