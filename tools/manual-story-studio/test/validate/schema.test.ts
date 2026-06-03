import assert from "node:assert/strict";
import test from "node:test";

import {
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecordClass,
} from "../../src/schema/manual-story.js";
import {
  MANUAL_CHARACTER_PROFILE_SCHEMA,
  parseAndValidateYaml,
  validateAgainstSchema,
  validateManualStoryMetadata,
  validateRecord,
} from "../../src/validate/schema.js";

function commonFields(id: string): Record<string, unknown> {
  return {
    id,
    title: "Title",
    active: true,
    importance: "medium",
    tags: [],
    summary: "summary",
    details: "details",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    last_reviewed_after_segment: null,
    notes: "",
  };
}

function castProfile(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...commonFields(id),
    display_name: "Display",
    roles: ["viewpoint"],
    identity: {
      one_line: "one",
      public_face: "pf",
      private_pressure: "pp",
    },
    world_pressure_core: {
      world_produced_wound: "w",
      active_appetite: "a",
      self_mythology: "s",
      irreconcilable_contradiction: "i",
      relational_charge: "r",
      moral_psychological_edge: "m",
      cannot_be_swapped_out_because: "c",
    },
    body_and_presence: {
      physicality: "p",
      body_limits: "b",
      habitual_gestures: "h",
      clothing_or_presentation: "c",
      social_presentation: "s",
    },
    voice: {
      baseline: "b",
      under_pressure: "u",
      intimacy: "i",
      evasion: "e",
      anger: "a",
      lying: "l",
      anti_generic_warnings: [],
    },
    pressure_behavior: {
      cornered: "c",
      tempted: "t",
      humiliated: "h",
      protecting_attachment: "p",
      offered_power: "o",
    },
    perception_and_embodiment: {
      notices: "n",
      misses: "m",
      misreads: "mr",
      sensory_bias: "s",
    },
    agency_and_planning: {
      default_strategy: "d",
      risk_style: "r",
      fallback_style: "f",
      planning_blind_spots: "p",
    },
    relationship_behavior: {},
    prose_constraints: {
      prose_must_not_imply: [],
      forbidden_inventions: [],
      voice_do_not_do: [],
    },
    ...overrides,
  };
}

const VALID_PER_CLASS: Record<ManualRecordClass, Record<string, unknown>> = {
  cast: castProfile("mchar-1"),
  entities: { ...commonFields("ment-1"), kind: "institution" },
  statuses: { ...commonFields("mstat-1"), subject: "mchar-1", kind: "life" },
  locations: commonFields("mloc-1"),
  objects: {
    ...commonFields("mobj-1"),
    current_location: null,
    current_holder: null,
  },
  facts: commonFields("mfact-1"),
  beliefs: {
    ...commonFields("mbel-1"),
    holder: "mchar-1",
    truth_relation: "true",
    confidence: "high",
  },
  intentions: {
    ...commonFields("mint-1"),
    holder: "mchar-1",
    target: "target",
  },
  plans: {
    ...commonFields("mplan-1"),
    holder: "mchar-1",
    target: "t",
    visibility: "private",
  },
  emotions: {
    ...commonFields("memo-1"),
    holder: "mchar-1",
    valence: "positive",
    intensity: "mild",
  },
  relationships: {
    ...commonFields("mrel-1"),
    between: ["mchar-1", "mchar-2"],
    axes: {
      trust: "medium",
      fear: "low",
      attraction: "low",
      power: "low",
      respect: "medium",
      familiarity: "medium",
    },
  },
  threads: {
    ...commonFields("mthr-1"),
    subject: "subject",
    status: "open",
  },
  obligations: {
    ...commonFields("mobl-1"),
    owed_by: "mchar-1",
    owed_to: "mchar-2",
    urgency: "low",
  },
  consequences: {
    ...commonFields("mcnsq-1"),
    caused_by_segment: null,
    pending: true,
    urgency: "low",
  },
  clocks: {
    ...commonFields("mclock-1"),
    axis: "trust",
    value: 3,
    direction: "rising",
  },
  secrets: {
    ...commonFields("msecret-1"),
    held_by: ["mchar-1"],
    audience_visibility: "hidden",
    forbidden_reveal_tags: [],
  },
  questions: {
    ...commonFields("mq-1"),
    kind: "open",
    answer_known: false,
    must_not_resolve_unless: [],
  },
  artifacts: {
    ...commonFields("martifact-1"),
    kind: "physical",
    current_holder: null,
    provenance: "p",
  },
  "beat-templates": {
    id: "mtemplate-1",
    title: "Soft Confrontation",
    active: true,
    pressure_type: "intimacy",
    turn_type: "escalation",
    preconditions_text: "A relationship wound is already active.",
    do_not_resolve: [],
    expected_state_review: ["relationships", "emotions"],
    stop_after: "",
    anti_patterns: [],
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
      location_tags_any: [],
    },
    excludes: {
      record_tags_any: ["active-violence"],
      forbidden_if_secret_tags: ["must-not-reveal-yet"],
    },
    beat_guidance: [
      { function: "setup", instruction: "Bring them into the same room." },
      { function: "pressure", instruction: "Let one ask the question." },
      { function: "exit", instruction: "Allow the other to retreat." },
    ],
    forbidden_inventions: [],
    author_notes: "",
  },
};

const REQUIRED_COMMON_FIELDS = [
  "id",
  "title",
  "active",
  "importance",
  "tags",
  "summary",
  "details",
  "refs",
  "prompt_visibility",
  "last_reviewed_after_segment",
  "notes",
];

test("validateRecord: every class accepts a fully populated valid record", () => {
  for (const [className, fixture] of Object.entries(VALID_PER_CLASS)) {
    const result = validateRecord(className as ManualRecordClass, fixture);
    assert.equal(
      result.ok,
      true,
      `class ${className} should validate; got: ${JSON.stringify(result)}`,
    );
  }
  // also ensure the fixture map covers all 18 prefixes
  assert.equal(
    Object.keys(VALID_PER_CLASS).sort().join(","),
    Object.keys(MANUAL_RECORD_CLASS_PREFIXES).sort().join(","),
  );
});

test("validateRecord: missing each required common field is rejected per class", () => {
  for (const [className, fixture] of Object.entries(VALID_PER_CLASS)) {
    // beat-templates has its own distinct schema shape (no common record
    // fields) and routes through validateBeatTemplate; covered separately
    // in test/templates/beat-template-schema.test.ts.
    if (className === "beat-templates") continue;
    for (const field of REQUIRED_COMMON_FIELDS) {
      const broken = { ...fixture };
      delete broken[field];
      const result = validateRecord(className as ManualRecordClass, broken);
      assert.equal(
        result.ok,
        false,
        `class ${className} should reject missing ${field}`,
      );
      if (!result.ok) {
        const found = result.errors.find((e) => e.field === field);
        assert.ok(found, `class ${className} should report missing ${field}`);
      }
    }
  }
});

test("validateRecord: enum mismatch yields error naming bad value and allowed set", () => {
  const broken = { ...VALID_PER_CLASS.beliefs, truth_relation: "almost_true" };
  const result = validateRecord("beliefs", broken);
  assert.equal(result.ok, false);
  if (!result.ok) {
    const err = result.errors.find((e) => e.field === "truth_relation");
    assert.ok(err);
    assert.match(err!.message, /almost_true/);
    assert.match(err!.message, /partly_true/);
  }
});

test("validateRecord: importance enum rejected at common-field level", () => {
  const broken = { ...VALID_PER_CLASS.facts, importance: "trivial" };
  const result = validateRecord("facts", broken);
  assert.equal(result.ok, false);
});

test("validateRecord: relationships.between requires a pair of strings", () => {
  const broken = {
    ...VALID_PER_CLASS.relationships,
    between: ["mchar-1"],
  };
  const result = validateRecord("relationships", broken);
  assert.equal(result.ok, false);
});

test("validateRecord: refs sub-fields enforced as string arrays", () => {
  const broken = {
    ...VALID_PER_CLASS.facts,
    refs: { characters: "not-an-array", locations: [], related_records: [] },
  };
  const result = validateRecord("facts", broken);
  assert.equal(result.ok, false);
});

test("validateManualStoryMetadata: valid metadata passes", () => {
  const result = validateManualStoryMetadata(VALID_METADATA);
  assert.equal(
    result.ok,
    true,
    `metadata should validate; got: ${JSON.stringify(result)}`,
  );
});

test("validateManualStoryMetadata: invalid enum rejected", () => {
  for (const [field, badValue] of [
    ["pov", "third-omniscient"],
    ["tense", "future"],
    ["content_intensity", "extreme"],
    ["language_register", "robotic"],
  ] as const) {
    const broken = {
      ...VALID_METADATA,
      story_contract: { ...VALID_METADATA.story_contract, [field]: badValue },
    };
    const result = validateManualStoryMetadata(broken);
    assert.equal(result.ok, false, `metadata should reject ${field}=${badValue}`);
  }
});

test("validateManualStoryMetadata: prose_preferences enum rejected", () => {
  for (const [field, badValue] of [
    ["psychic_distance", "void"],
    ["dialogue_density", "torrential"],
    ["interiority", "telepathic"],
    ["paragraphing", "haiku"],
  ] as const) {
    const broken = {
      ...VALID_METADATA,
      story_contract: {
        ...VALID_METADATA.story_contract,
        prose_preferences: {
          ...VALID_METADATA.story_contract.prose_preferences,
          [field]: badValue,
        },
      },
    };
    const result = validateManualStoryMetadata(broken);
    assert.equal(
      result.ok,
      false,
      `metadata should reject prose_preferences.${field}=${badValue}`,
    );
  }
});

test("validateManualStoryMetadata: missing required nested field rejected", () => {
  const broken = { ...VALID_METADATA } as Record<string, unknown>;
  delete broken.prompt_policy;
  const result = validateManualStoryMetadata(broken);
  assert.equal(result.ok, false);
});

test("Manual Character Profile: source_world_character pattern accepted as CHAR-*", () => {
  const fixture = castProfile("mchar-1", { source_world_character: "CHAR-7" });
  const result = validateAgainstSchema(fixture, MANUAL_CHARACTER_PROFILE_SCHEMA);
  assert.equal(result.ok, true);
});

test("Manual Character Profile: source_world_character pattern rejects STCHAR-*", () => {
  const fixture = castProfile("mchar-1", { source_world_character: "STCHAR-7" });
  const result = validateAgainstSchema(fixture, MANUAL_CHARACTER_PROFILE_SCHEMA);
  assert.equal(result.ok, false);
});

test("Manual Character Profile: source_world_character absence is accepted", () => {
  const fixture = castProfile("mchar-1");
  const result = validateAgainstSchema(fixture, MANUAL_CHARACTER_PROFILE_SCHEMA);
  assert.equal(result.ok, true);
});

test("parseAndValidateYaml: returns parsed value when valid", () => {
  const yamlText = `id: mfact-1
title: T
active: true
importance: medium
tags: []
summary: s
details: d
refs:
  characters: []
  locations: []
  related_records: []
prompt_visibility: always
last_reviewed_after_segment: null
notes: ""
`;
  const result = parseAndValidateYaml(
    yamlText,
    {
      required: [
        "id",
        "title",
        "active",
        "importance",
        "tags",
        "summary",
        "details",
        "refs",
        "prompt_visibility",
        "last_reviewed_after_segment",
        "notes",
      ],
      scalars: {
        id: "string",
        title: "string",
        active: "boolean",
        summary: "string",
        details: "string",
        notes: "string",
      },
      nullable: ["last_reviewed_after_segment"],
      stringArrays: ["tags"],
      enums: {
        importance: ["low", "medium", "high", "central"],
        prompt_visibility: [
          "always",
          "include_when_relevant",
          "only_if_pinned",
          "never_prompt",
        ],
      },
      nested: {
        refs: {
          required: ["characters", "locations", "related_records"],
          stringArrays: ["characters", "locations", "related_records"],
        },
      },
    },
  );
  assert.equal(result.ok, true);
});

test("parseAndValidateYaml: yaml parse error surfaces", () => {
  const result = parseAndValidateYaml("not: valid: yaml: here", {
    required: [],
  });
  assert.equal(result.ok, false);
});

const VALID_METADATA = {
  schema_version: "manual-story.v1" as const,
  world_slug: "test-world",
  manual_story_slug: "test-story",
  title: "T",
  created_at: "2026-05-30T00:00:00.000Z",
  updated_at: "2026-05-30T00:00:00.000Z",
  source: { world_commit: null, notes: "" },
  story_contract: {
    premise: "p",
    tone: "t",
    pov: "first" as const,
    tense: "past" as const,
    content_intensity: "general" as const,
    explicitness: "",
    language_register: "casual" as const,
    prose_preferences: {
      psychic_distance: "deep_close" as const,
      dialogue_density: "dense" as const,
      interiority: "free_indirect" as const,
      paragraphing: "literary" as const,
    },
  },
  cast_order: [],
  segment_order: [],
  prompt_policy: {
    save_prompts: true,
    require_moment_directive: true,
    default_beat_count: "2-5",
    include_recent_segments: 1,
    recent_template_advisory_window: 2,
  },
  manuscript: {
    compile_on_segment_save: true,
    include_segment_titles: false,
    allow_reorder: false,
  },
};
