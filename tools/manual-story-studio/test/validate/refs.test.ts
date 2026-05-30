import assert from "node:assert/strict";
import test from "node:test";

import type {
  ManualBeliefRecord,
  ManualCharacterRecord,
  ManualConsequenceRecord,
  ManualObjectRecord,
  ManualObligationRecord,
  ManualPlanRecord,
  ManualRelationshipRecord,
  ManualSecretRecord,
  ManualStatusRecord,
  ManualArtifactRecord,
  ManualIntentionRecord,
  ManualEmotionRecord,
  ManualFactRecord,
} from "../../src/schema/manual-story.js";
import {
  emptyKnownIds,
  validateRefs,
  type KnownIds,
} from "../../src/validate/refs.js";

function commonBase(id: string): Pick<
  ManualFactRecord,
  | "id"
  | "title"
  | "active"
  | "importance"
  | "tags"
  | "summary"
  | "details"
  | "refs"
  | "prompt_visibility"
  | "last_reviewed_after_segment"
  | "notes"
> {
  return {
    id,
    title: "t",
    active: true,
    importance: "medium",
    tags: [],
    summary: "",
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    last_reviewed_after_segment: null,
    notes: "",
  };
}

function castProfile(id: string): ManualCharacterRecord {
  return {
    ...commonBase(id),
    display_name: "d",
    roles: ["viewpoint"],
    identity: { one_line: "", public_face: "", private_pressure: "" },
    world_pressure_core: {
      world_produced_wound: "",
      active_appetite: "",
      self_mythology: "",
      irreconcilable_contradiction: "",
      relational_charge: "",
      moral_psychological_edge: "",
      cannot_be_swapped_out_because: "",
    },
    body_and_presence: {
      physicality: "",
      body_limits: "",
      habitual_gestures: "",
      clothing_or_presentation: "",
      social_presentation: "",
    },
    voice: {
      baseline: "",
      under_pressure: "",
      intimacy: "",
      evasion: "",
      anger: "",
      lying: "",
      anti_generic_warnings: [],
    },
    pressure_behavior: {
      cornered: "",
      tempted: "",
      humiliated: "",
      protecting_attachment: "",
      offered_power: "",
    },
    perception_and_embodiment: {
      notices: "",
      misses: "",
      misreads: "",
      sensory_bias: "",
    },
    agency_and_planning: {
      default_strategy: "",
      risk_style: "",
      fallback_style: "",
      planning_blind_spots: "",
    },
    relationship_behavior: {},
    prose_constraints: {
      prose_must_not_imply: [],
      forbidden_inventions: [],
      voice_do_not_do: [],
    },
  };
}

function withCastIds(ids: string[]): KnownIds {
  const k = emptyKnownIds();
  for (const id of ids) k.cast.add(id);
  return k;
}

test("refs.characters dangling: violation reported", () => {
  const record: ManualFactRecord = {
    ...commonBase("mfact-1"),
    refs: {
      characters: ["mchar-99"],
      locations: [],
      related_records: [],
    },
  };
  const violations = validateRefs(record, "facts", emptyKnownIds());
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.field, "refs.characters[0]");
  assert.equal(violations[0]?.missingId, "mchar-99");
});

test("refs.locations dangling: violation reported", () => {
  const record: ManualFactRecord = {
    ...commonBase("mfact-1"),
    refs: {
      characters: [],
      locations: ["mloc-99"],
      related_records: [],
    },
  };
  const violations = validateRefs(record, "facts", emptyKnownIds());
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.field, "refs.locations[0]");
});

test("refs.related_records routes by prefix; unknown prefix flagged", () => {
  const known = withCastIds([]);
  known.beliefs.add("mbel-1");
  const record: ManualFactRecord = {
    ...commonBase("mfact-1"),
    refs: {
      characters: [],
      locations: [],
      related_records: ["mbel-1", "mbel-2", "xx-3"],
    },
  };
  const violations = validateRefs(record, "facts", known);
  assert.equal(violations.length, 2);
  assert.equal(violations[0]?.missingId, "mbel-2");
  assert.equal(violations[1]?.missingId, "xx-3");
});

test("beliefs.holder dangling: violation", () => {
  const record: ManualBeliefRecord = {
    ...commonBase("mbel-1"),
    holder: "mchar-99",
    truth_relation: "true",
    confidence: "low",
  };
  const violations = validateRefs(record, "beliefs", emptyKnownIds());
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.field, "holder");
});

test("intentions/plans/emotions: holder pointer respected", () => {
  for (const c of ["intentions", "plans", "emotions"] as const) {
    const r =
      c === "intentions"
        ? ({ ...commonBase("mint-1"), holder: "mchar-99", target: "t" } as ManualIntentionRecord)
        : c === "plans"
          ? ({
              ...commonBase("mplan-1"),
              holder: "mchar-99",
              target: "t",
              visibility: "private",
            } as ManualPlanRecord)
          : ({
              ...commonBase("memo-1"),
              holder: "mchar-99",
              valence: "positive",
              intensity: "mild",
            } as ManualEmotionRecord);
    const violations = validateRefs(r, c, emptyKnownIds());
    assert.equal(violations.length, 1, `class ${c}`);
    assert.equal(violations[0]?.field, "holder");
  }
});

test("relationships.between: both legs validated; pair errors at indexed paths", () => {
  const record: ManualRelationshipRecord = {
    ...commonBase("mrel-1"),
    between: ["mchar-1", "mchar-99"],
    axes: {
      trust: "medium",
      fear: "low",
      attraction: "low",
      power: "low",
      respect: "medium",
      familiarity: "medium",
    },
  };
  const violations = validateRefs(record, "relationships", withCastIds(["mchar-1"]));
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.field, "between[1]");
  assert.equal(violations[0]?.missingId, "mchar-99");
});

test("obligations.owed_by + owed_to checked independently", () => {
  const record: ManualObligationRecord = {
    ...commonBase("mobl-1"),
    owed_by: "mchar-99",
    owed_to: "mchar-1",
    urgency: "low",
  };
  const violations = validateRefs(record, "obligations", withCastIds(["mchar-1"]));
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.field, "owed_by");
});

test("objects: nullable pointers tolerate null", () => {
  const record: ManualObjectRecord = {
    ...commonBase("mobj-1"),
    current_location: null,
    current_holder: null,
  };
  const violations = validateRefs(record, "objects", emptyKnownIds());
  assert.equal(violations.length, 0);
});

test("objects: bad current_location / current_holder flagged", () => {
  const record: ManualObjectRecord = {
    ...commonBase("mobj-1"),
    current_location: "mloc-99",
    current_holder: "mchar-99",
  };
  const violations = validateRefs(record, "objects", emptyKnownIds());
  assert.equal(violations.length, 2);
});

test("artifacts: union pointer current_holder accepts cast OR locations", () => {
  const known = withCastIds(["mchar-1"]);
  const okRecord: ManualArtifactRecord = {
    ...commonBase("martifact-1"),
    kind: "physical",
    current_holder: "mchar-1",
    provenance: "p",
  };
  assert.equal(validateRefs(okRecord, "artifacts", known).length, 0);

  const okLoc: ManualArtifactRecord = {
    ...commonBase("martifact-2"),
    kind: "physical",
    current_holder: "mloc-5",
    provenance: "p",
  };
  known.locations.add("mloc-5");
  assert.equal(validateRefs(okLoc, "artifacts", known).length, 0);

  const bad: ManualArtifactRecord = {
    ...commonBase("martifact-3"),
    kind: "physical",
    current_holder: "mloc-99",
    provenance: "p",
  };
  assert.equal(validateRefs(bad, "artifacts", known).length, 1);
});

test("statuses: subject pointer accepts cast OR locations OR objects", () => {
  const known = withCastIds(["mchar-1"]);
  const r: ManualStatusRecord = {
    ...commonBase("mstat-1"),
    subject: "mchar-1",
    kind: "life",
  };
  assert.equal(validateRefs(r, "statuses", known).length, 0);

  const bad: ManualStatusRecord = {
    ...commonBase("mstat-2"),
    subject: "mchar-99",
    kind: "life",
  };
  assert.equal(validateRefs(bad, "statuses", known).length, 1);
});

test("consequences: caused_by_segment looks up segment ID; null OK", () => {
  const known = emptyKnownIds();
  known.segments.add("SEG-1");
  const ok: ManualConsequenceRecord = {
    ...commonBase("mcnsq-1"),
    caused_by_segment: "SEG-1",
    pending: true,
    urgency: "low",
  };
  assert.equal(validateRefs(ok, "consequences", known).length, 0);
  const okNull: ManualConsequenceRecord = {
    ...commonBase("mcnsq-2"),
    caused_by_segment: null,
    pending: false,
    urgency: "low",
  };
  assert.equal(validateRefs(okNull, "consequences", known).length, 0);
  const bad: ManualConsequenceRecord = {
    ...commonBase("mcnsq-3"),
    caused_by_segment: "SEG-99",
    pending: false,
    urgency: "low",
  };
  assert.equal(validateRefs(bad, "consequences", known).length, 1);
});

test("secrets.held_by: list of cast IDs validated per element", () => {
  const known = withCastIds(["mchar-1"]);
  const record: ManualSecretRecord = {
    ...commonBase("msecret-1"),
    held_by: ["mchar-1", "mchar-99"],
    audience_visibility: "hidden",
    forbidden_reveal_tags: [],
  };
  const violations = validateRefs(record, "secrets", known);
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.field, "held_by[1]");
});

test("archived (active: false) records still satisfy refs", () => {
  const known = withCastIds(["mchar-3"]);
  const r: ManualBeliefRecord = {
    ...commonBase("mbel-1"),
    holder: "mchar-3",
    truth_relation: "true",
    confidence: "low",
  };
  // active:false is on the *target* (cast); ref validator only checks
  // the ID set, and `listAllKnownIds` includes archived IDs.
  assert.equal(validateRefs(r, "beliefs", known).length, 0);
});

test("Manual Character Profile: source_world_character is NOT inspected by the validator", () => {
  const profile = castProfile("mchar-1");
  profile.source_world_character = "CHAR-99";
  // No world-canon knownIds threaded; if the validator inspected it,
  // we would see a violation. Empty violations proves the explicit skip.
  const violations = validateRefs(profile, "cast", emptyKnownIds());
  assert.equal(violations.length, 0);
});

test("empty refs / no per-class pointers: zero violations", () => {
  const r: ManualFactRecord = commonBase("mfact-1");
  const violations = validateRefs(r, "facts", emptyKnownIds());
  assert.equal(violations.length, 0);
});

test("shallow scope: validator does not recurse into related_record's own refs", () => {
  const known = emptyKnownIds();
  known.relationships.add("mrel-7");
  const record: ManualFactRecord = {
    ...commonBase("mfact-1"),
    refs: {
      characters: [],
      locations: [],
      related_records: ["mrel-7"],
    },
  };
  const violations = validateRefs(record, "facts", known);
  // mrel-7 is "known" (in the set). Validator does not follow into mrel-7's
  // own between[] to check whether those cast IDs exist.
  assert.equal(violations.length, 0);
});
