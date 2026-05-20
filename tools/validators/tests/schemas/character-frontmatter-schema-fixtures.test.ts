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

function compileCharacterSchema(): ValidateFunction {
  const schema = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "src", "schemas", "character-frontmatter.schema.json"), "utf8")
  );
  return new Ajv2020({ allErrors: true, strict: true }).compile(schema);
}

function validDramaticCore(): Record<string, unknown> {
  return {
    world_produced_wound: "A monastery ledger made his debt public before his name was legal.",
    active_appetite: "He wants one public pardon that cannot be re-entered as debt.",
    self_mythology: "He treats himself as the last honest debtor.",
    irreconcilable_contradiction: "He must use debt law to escape debt law.",
    pressure_behavior: {
      cornered: "asks for the clause number",
      tempted: "offers future labor",
      humiliated: "becomes ceremonial",
      offered_power: "requires witnesses",
      protecting_attachment: "takes the blame"
    },
    relational_charge: [
      {
        target_or_relation_type: "ledger sibling",
        need: "recognition",
        resentment_or_fear: "being reduced to the old account",
        likely_harm_or_betrayal: "will falsify a minor entry to protect them"
      }
    ],
    moral_psychological_edge: "He believes truth without public record is cowardice.",
    signature_scene_behaviors: ["straightens seals", "counts witness marks", "turns insults into filings"],
    voice_under_pressure: {
      lying: "over-specific",
      begging: "formal",
      threatening: "legalistic",
      grieving_or_hiding_ignorance: "quotes ritual"
    },
    cannot_be_swapped_out_because: "His wound is produced by this world's debt-recording institution."
  };
}

function validCharacter(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    character_id: "CHAR-1",
    slug: "tollen-ledger-witness",
    name: "Tollen",
    species: "human",
    age_band: "adult",
    place_of_origin: "Lower Ferry",
    current_location: "River Tollhouse",
    date: "rain season",
    social_position: "licensed witness",
    profession: "ledger courier",
    kinship_situation: "oath sibling",
    religious_ideological_environment: "ledger cult",
    major_local_pressures: ["debt audit"],
    intended_narrative_role: "protagonist",
    dramatic_core: validDramaticCore(),
    world_consistency: {
      canon_facts_consulted: ["CF-1"],
      invariants_respected: ["SOC-1"],
      mystery_reserve_firewall: ["M-1"],
      distribution_exceptions: [],
      continuity_checked_with: []
    },
    source_basis: { generated_from: "NCP-12" },
    ...overrides
  };
}

test("character frontmatter schema accepts complete dramatic_core", () => {
  const validate = compileCharacterSchema();

  assert.equal(validate(validCharacter()), true, JSON.stringify(validate.errors));
});

test("character frontmatter schema rejects missing dramatic_core", () => {
  const validate = compileCharacterSchema();
  const character = validCharacter();
  delete character.dramatic_core;

  assert.equal(validate(character), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.message?.includes("dramatic_core")));
});

test("character frontmatter schema requires at least three signature scene behaviors", () => {
  const validate = compileCharacterSchema();
  const dramaticCore = validDramaticCore();
  dramaticCore.signature_scene_behaviors = ["straightens seals", "counts witness marks"];

  assert.equal(validate(validCharacter({ dramatic_core: dramaticCore })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "minItems" && error.instancePath.endsWith("/signature_scene_behaviors")));
});
