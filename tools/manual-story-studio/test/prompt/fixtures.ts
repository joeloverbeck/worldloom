// Shared fixture builders for translator + section emitter + compose tests.
// Each builder produces a minimally well-formed Manual Studio record so
// translator unit tests stay focused on the field-shape they're proving.

import type {
  ManualArtifactRecord,
  ManualBeliefRecord,
  ManualCharacterRecord,
  ManualClockRecord,
  ManualConsequenceRecord,
  ManualEmotionRecord,
  ManualEntityRecord,
  ManualFactRecord,
  ManualIntentionRecord,
  ManualLocationRecord,
  ManualObjectRecord,
  ManualObligationRecord,
  ManualPlanRecord,
  ManualQuestionRecord,
  ManualRelationshipRecord,
  ManualSecretRecord,
  ManualStatusRecord,
  ManualThreadRecord,
  RecordCommonFields,
} from "../../src/schema/manual-story.js";
import type { TranslatorContext } from "../../src/prompt/translators/index.js";

const EMPTY_REFS = {
  characters: [] as string[],
  locations: [] as string[],
  related_records: [] as string[],
};

export function common(
  id: string,
  title: string,
  overrides: Partial<RecordCommonFields> = {},
): RecordCommonFields {
  return {
    id,
    title,
    active: true,
    importance: "medium",
    tags: [],
    summary: "",
    details: "",
    refs: { ...EMPTY_REFS, ...(overrides.refs ?? {}) },
    prompt_visibility: "include_when_relevant",
    notes: "",
    ...overrides,
  };
}

export function fixtureCast(
  id: string,
  title: string,
  overrides: Partial<ManualCharacterRecord> = {},
): ManualCharacterRecord {
  return {
    ...common(id, title),
    display_name: title,
    roles: ["viewpoint"],
    identity: {
      one_line: "",
      public_face: "",
      private_pressure: "",
    },
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
    ...overrides,
  };
}

export function fixtureEntity(
  id: string,
  title: string,
  overrides: Partial<ManualEntityRecord> = {},
): ManualEntityRecord {
  return { ...common(id, title), kind: "institution", ...overrides };
}

export function fixtureStatus(
  id: string,
  title: string,
  overrides: Partial<ManualStatusRecord> = {},
): ManualStatusRecord {
  return {
    ...common(id, title),
    subject: "mchar-1",
    kind: "bodily",
    ...overrides,
  };
}

export function fixtureLocation(
  id: string,
  title: string,
  overrides: Partial<ManualLocationRecord> = {},
): ManualLocationRecord {
  return { ...common(id, title), ...overrides };
}

export function fixtureObject(
  id: string,
  title: string,
  overrides: Partial<ManualObjectRecord> = {},
): ManualObjectRecord {
  return {
    ...common(id, title),
    current_location: null,
    current_holder: null,
    ...overrides,
  };
}

export function fixtureFact(
  id: string,
  title: string,
  overrides: Partial<ManualFactRecord> = {},
): ManualFactRecord {
  return { ...common(id, title), ...overrides };
}

export function fixtureBelief(
  id: string,
  title: string,
  overrides: Partial<ManualBeliefRecord> = {},
): ManualBeliefRecord {
  return {
    ...common(id, title),
    holder: "mchar-1",
    truth_relation: "unknown",
    confidence: "medium",
    ...overrides,
  };
}

export function fixtureIntention(
  id: string,
  title: string,
  overrides: Partial<ManualIntentionRecord> = {},
): ManualIntentionRecord {
  return {
    ...common(id, title),
    holder: "mchar-1",
    target: "mchar-2",
    ...overrides,
  };
}

export function fixturePlan(
  id: string,
  title: string,
  overrides: Partial<ManualPlanRecord> = {},
): ManualPlanRecord {
  return {
    ...common(id, title),
    holder: "mchar-1",
    target: "mchar-2",
    visibility: "private",
    ...overrides,
  };
}

export function fixtureEmotion(
  id: string,
  title: string,
  overrides: Partial<ManualEmotionRecord> = {},
): ManualEmotionRecord {
  return {
    ...common(id, title),
    holder: "mchar-1",
    valence: "mixed",
    intensity: "moderate",
    ...overrides,
  };
}

export function fixtureRelationship(
  id: string,
  title: string,
  overrides: Partial<ManualRelationshipRecord> = {},
): ManualRelationshipRecord {
  return {
    ...common(id, title),
    between: ["mchar-1", "mchar-2"],
    axes: {
      trust: "medium",
      fear: "low",
      attraction: "low",
      power: "medium",
      respect: "medium",
      familiarity: "medium",
    },
    ...overrides,
  };
}

export function fixtureThread(
  id: string,
  title: string,
  overrides: Partial<ManualThreadRecord> = {},
): ManualThreadRecord {
  return {
    ...common(id, title),
    subject: "mchar-1",
    status: "open",
    ...overrides,
  };
}

export function fixtureObligation(
  id: string,
  title: string,
  overrides: Partial<ManualObligationRecord> = {},
): ManualObligationRecord {
  return {
    ...common(id, title),
    owed_by: "mchar-1",
    owed_to: "mchar-2",
    urgency: "medium",
    ...overrides,
  };
}

export function fixtureConsequence(
  id: string,
  title: string,
  overrides: Partial<ManualConsequenceRecord> = {},
): ManualConsequenceRecord {
  return {
    ...common(id, title),
    caused_by_segment: null,
    pending: true,
    urgency: "medium",
    ...overrides,
  };
}

export function fixtureClock(
  id: string,
  title: string,
  overrides: Partial<ManualClockRecord> = {},
): ManualClockRecord {
  return {
    ...common(id, title),
    axis: "trust",
    value: 0,
    direction: "unset",
    ...overrides,
  };
}

export function fixtureSecret(
  id: string,
  title: string,
  overrides: Partial<ManualSecretRecord> = {},
): ManualSecretRecord {
  return {
    ...common(id, title),
    held_by: ["mchar-1"],
    audience_visibility: "hidden",
    forbidden_reveal_tags: [],
    ...overrides,
  };
}

export function fixtureQuestion(
  id: string,
  title: string,
  overrides: Partial<ManualQuestionRecord> = {},
): ManualQuestionRecord {
  return {
    ...common(id, title),
    kind: "open",
    answer_known: false,
    must_not_resolve_unless: [],
    ...overrides,
  };
}

export function fixtureArtifact(
  id: string,
  title: string,
  overrides: Partial<ManualArtifactRecord> = {},
): ManualArtifactRecord {
  return {
    ...common(id, title),
    kind: "text",
    current_holder: null,
    provenance: "",
    ...overrides,
  };
}

export function emptyCtx(): TranslatorContext {
  return {
    getCastTitle: () => null,
    getRecordTitle: () => null,
  };
}

export function fixtureCtx(
  cast: Record<string, string>,
  records: Record<string, string> = {},
): TranslatorContext {
  return {
    getCastTitle: (id) => cast[id] ?? null,
    getRecordTitle: (id) => records[id] ?? cast[id] ?? null,
  };
}

export const INTERNAL_ID_REGEX = /m[a-z]+-[0-9]+/g;

export function assertNoInternalIds(emitted: string, label: string): void {
  const matches = emitted.match(INTERNAL_ID_REGEX);
  if (matches && matches.length > 0) {
    throw new Error(
      `${label}: emitted internal ID(s) ${JSON.stringify(matches)} in:\n${emitted}`,
    );
  }
}
