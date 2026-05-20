import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { AnySchema, ValidateFunction } from "ajv";

type Ajv2020Instance = {
  compile(schema: AnySchema): ValidateFunction;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

function compileSchema(name: string): ValidateFunction {
  const schema = JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", `${name}.schema.json`), "utf8"));
  return new Ajv2020({ allErrors: true, strict: true }).compile(schema);
}

function validMemorabilityProfile(): Record<string, unknown> {
  return {
    seed_essence_preserved: ["Toll confession role"],
    world_produced_wound: "Her office requires public mercy and private debt collection.",
    active_appetite: "She wants one confessed debtor to name her as savior.",
    self_mythology: "She calls herself the only honest mouth in a town of ledgers.",
    irreconcilable_contradiction: "She protects debtors by making them permanently legible to creditors.",
    pressure_behavior: {
      cornered: "quotes receipt law",
      tempted: "asks who benefits",
      humiliated: "turns procedural",
      offered_power: "demands a witness",
      protecting_attachment: "lies by omission"
    },
    relational_charge: [
      {
        target_or_relation_type: "former debtor",
        need: "forgiveness",
        resentment_or_fear: "being exposed as sentimental",
        likely_harm_or_betrayal: "records the debtor's secret anyway"
      }
    ],
    moral_psychological_edge: "She believes rescue is valid only when it leaves a scar.",
    signature_scene_behaviors: ["folds receipts into charms", "counts exits before speaking", "answers prayers with fee schedules"],
    voice_under_pressure: {
      lying: "precise and priestly",
      begging: "transactional",
      threatening: "softly bureaucratic",
      grieving_or_hiding_ignorance: "recites doctrine"
    },
    cannot_be_swapped_out_because: "Only her confessional toll office makes mercy and audit the same act."
  };
}

function batchCriticPassTrace(): Record<string, unknown> {
  return {
    phase_1_continuity_archivist: "No duplicate office found.",
    phase_2_essence_extractor: "Debt-confession essence preserved.",
    phase_3_constellation_mosaic: "Occupies an open ledger-faith niche.",
    phase_5_institutional_everyday: "Turns toll work into daily pressure.",
    phase_8_epistemic_focalization: "Knows law, not metaphysics.",
    phase_9_voice_critic: "Speech stays procedural under pressure.",
    phase_9_artifact_authorship: "Could author receipt-prayers.",
    phase_11_theme_tone: "Fresh but world-rooted.",
    blandness_executioner: "Valid-but-dull version was rejected.",
    protagonist_grade_critic: "Can carry story pressure without plot-destiny fields."
  };
}

function upgradeCriticPassTrace(): Record<string, unknown> {
  return {
    seed_essence_extractor: "The toll-confessor seed keeps mercy tied to debt visibility.",
    world_pressure_mapper: "Seasonal audit law pressures her to expose the people she wants to save.",
    blandness_executioner: "Rejected a harmless clerk because the world pressure did not deform her choices.",
    protagonist_grade_critic: "Her cannot-swap reason is the confessional toll office's fusion of mercy and audit."
  };
}

function rejectedDirectionAuditEntry(direction: string): Record<string, unknown> {
  return {
    direction,
    preserved_essence: ["confession and debt remain fused"],
    mutation_attempted: `Pushed ${direction} into a sharper tollhouse pressure.`,
    rejection_reason: `${direction} weakened the office-specific contradiction.`
  };
}

function rejectedDirectionAuditEntries(count = 3): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => rejectedDirectionAuditEntry(`rejected direction ${index + 1}`));
}

function validCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    current_location: "River Tollhouse",
    place_of_origin: "Lower Ferry",
    date: "rain season",
    species: "human",
    age_band: "adult",
    social_position: "licensed confessor",
    profession: "toll clerk",
    kinship_situation: "estranged oath-sibling",
    religious_ideological_environment: "ledger cult",
    major_local_pressures: ["seasonal debt audit"],
    intended_narrative_role: "protagonist",
    central_contradiction: "Mercy through accounting",
    desired_emotional_tone: "bitterly tender",
    desired_arc_type: "pressure revelation",
    taboo_limit_themes: ["sexual coercion"],
    proposal_id: "NCP-12",
    batch_id: "NCB-3",
    slug: "maren-toll-confessor",
    title: "Maren, Toll Confessor",
    niche_summary: "A toll confessor whose mercy is inseparable from debt recordkeeping.",
    occupancy_strength: {
      current_state: "open",
      nearest_existing_occupants: [],
      overlap_type: "none",
      decisive_differences: ["confession-as-toll-office"]
    },
    depth_class: "protagonist_grade",
    proposal_family: "beloved institutional monster",
    diagnosis_target: "debt authority",
    memorability_profile: validMemorabilityProfile(),
    upgrade_lineage: {
      origin_kind: "batch_generated",
      source_path: "",
      source_proposal_id: "",
      mutation_summary: "",
      rejected_directions_audit: ["generic penitent was too soft"]
    },
    scores: {
      validity: { world_rootedness: 5 },
      memorability: { protagonist_grade_force: 5 }
    },
    score_aggregate: 82.5,
    canon_assumption_flags: {
      status: "canon-safe",
      edge_assumptions: [],
      implied_new_facts: []
    },
    recommended_next_step: "generate_immediately",
    critic_pass_trace: batchCriticPassTrace(),
    canon_safety_check: {
      invariants_respected: ["SOC-1"],
      mystery_reserve_firewall: ["M-1"],
      distribution_discipline: { canon_facts_consulted: ["CF-1"] }
    },
    source_basis: {
      world_slug: "animalia",
      batch_id: "NCB-3",
      generated_date: "2026-05-20",
      user_approved: false
    },
    notes: "No repairs.",
    ...overrides
  };
}

test("character proposal card schema accepts complete cards with optional template fields", () => {
  const validate = compileSchema("character-proposal-card");

  assert.equal(validate(validCard()), true, JSON.stringify(validate.errors));
});

test("character proposal card schema accepts single-seed upgrades without batch_id", () => {
  const validate = compileSchema("character-proposal-card");
  const card = validCard({
    batch_id: undefined,
    upgrade_lineage: {
      origin_kind: "upgraded_seed",
      source_path: "briefs/maren.md",
      source_proposal_id: "",
      mutation_summary: "Kept the toll role and sharpened the debt appetite.",
      rejected_directions_audit: rejectedDirectionAuditEntries()
    },
    critic_pass_trace: upgradeCriticPassTrace()
  });
  delete card.batch_id;

  assert.equal(validate(card), true, JSON.stringify(validate.errors));
});

test("character proposal card schema rejects upgraded seeds with fewer than three rejected directions", () => {
  const validate = compileSchema("character-proposal-card");
  const card = validCard({
    batch_id: undefined,
    upgrade_lineage: {
      origin_kind: "upgraded_seed",
      source_path: "briefs/maren.md",
      source_proposal_id: "",
      mutation_summary: "Kept the toll role and sharpened the debt appetite.",
      rejected_directions_audit: rejectedDirectionAuditEntries(2)
    },
    critic_pass_trace: upgradeCriticPassTrace()
  });
  delete card.batch_id;

  assert.equal(validate(card), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "minItems" && error.instancePath.endsWith("/rejected_directions_audit")));
});

test("character proposal card schema rejects upgraded seeds carrying the batch critic trace", () => {
  const validate = compileSchema("character-proposal-card");
  const card = validCard({
    batch_id: undefined,
    upgrade_lineage: {
      origin_kind: "upgraded_seed",
      source_path: "briefs/maren.md",
      source_proposal_id: "",
      mutation_summary: "Kept the toll role and sharpened the debt appetite.",
      rejected_directions_audit: rejectedDirectionAuditEntries()
    },
    critic_pass_trace: batchCriticPassTrace()
  });
  delete card.batch_id;

  assert.equal(validate(card), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.instancePath === "/critic_pass_trace"));
});

test("character proposal card schema rejects batch-generated cards carrying the upgrade critic trace", () => {
  const validate = compileSchema("character-proposal-card");
  const card = validCard({
    critic_pass_trace: upgradeCriticPassTrace()
  });

  assert.equal(validate(card), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.instancePath === "/critic_pass_trace"));
});

test("character proposal card schema rejects missing memorability_profile", () => {
  const validate = compileSchema("character-proposal-card");
  const card = validCard();
  delete card.memorability_profile;

  assert.equal(validate(card), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.message?.includes("memorability_profile")));
});

test("character proposal card schema rejects canon-requiring cards without implied facts", () => {
  const validate = compileSchema("character-proposal-card");
  const card = validCard({
    canon_assumption_flags: {
      status: "canon-requiring",
      edge_assumptions: [],
      implied_new_facts: []
    }
  });

  assert.equal(validate(card), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "minItems" && error.instancePath.endsWith("/implied_new_facts")));
});

test("character proposal batch schema accepts the batch manifest frontmatter shape", () => {
  const validate = compileSchema("character-proposal-batch");
  const batch = {
    batch_id: "NCB-3",
    world_slug: "animalia",
    generated_date: "2026-05-20",
    parameters: {
      batch_size: 7,
      depth_mix: { emblematic: 1, elastic: 3, round_load_bearing: 3 },
      spread_vs_focus: "spread",
      density_rule_mode: "auto",
      target_domains: ["river tolls"],
      taboo_areas: ["sexual coercion"],
      ordinary_vs_exceptional_mix: "balanced",
      artifact_author_share: 0.25,
      under_modeled_priority: ["debt law"],
      max_overlap_allowed: "crowded_permitted",
      story_scale_mix: { intimate: 2, local: 3, regional: 1, transregional: 1 },
      mosaic_cluster_preference: "mixed",
      upstream_audit_path: ""
    },
    registry_summary: "The registry has no toll-confessor figure.",
    card_ids: ["NCP-12"],
    dropped_card_ids: [],
    user_approved: false,
    notes: "No batch-level repairs."
  };

  assert.equal(validate(batch), true, JSON.stringify(validate.errors));
});
