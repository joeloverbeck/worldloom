import assert from "node:assert/strict";
import test from "node:test";

import { castTranslator } from "../src/prompt/translators/cast.js";
import "../src/prompt/translators/cast.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCast,
  fixtureCtx,
} from "./prompt/fixtures.js";

test("cast translator emits all nine profile blocks", () => {
  const record = fixtureCast("mchar-1", "Jon", {
    identity: {
      one_line: "A scribe haunted by an unmade promise",
      public_face: "Polite, efficient",
      private_pressure: "Owes a debt he cannot afford",
    },
    world_pressure_core: {
      world_produced_wound: "Mother burned in the river fires",
      active_appetite: "To find the witness who lied",
      self_mythology: "I am the calm one",
      irreconcilable_contradiction: "Loves a woman he was paid to watch",
      relational_charge: "Trust is currency",
      moral_psychological_edge: "Will lie to protect; cannot bear being lied to",
      cannot_be_swapped_out_because: "Only he knows where the ledger is",
    },
    voice: {
      baseline: "Dry, precise",
      under_pressure: "Curt",
      intimacy: "Hesitant",
      evasion: "Changes subject",
      anger: "Cold pauses",
      lying: "Uses formal register",
      anti_generic_warnings: ["never quips", "never sighs"],
    },
    body_and_presence: {
      physicality: "Lean, narrow shoulders",
      body_limits: "Bad shoulder",
      habitual_gestures: "Pinches the bridge of his nose",
      clothing_or_presentation: "Grey wool",
      social_presentation: "Reads as a clerk",
    },
    pressure_behavior: {
      cornered: "Goes quiet",
      tempted: "Bargains internally",
      humiliated: "Withdraws",
      protecting_attachment: "Lies",
      offered_power: "Refuses",
    },
    perception_and_embodiment: {
      notices: "Smells, hands",
      misses: "Body language above the neck",
      misreads: "Silence as agreement",
      sensory_bias: "Auditory",
    },
    agency_and_planning: {
      default_strategy: "Negotiate",
      risk_style: "Conservative",
      fallback_style: "Disappear",
      planning_blind_spots: "Underestimates institutional inertia",
    },
    relationship_behavior: { "mchar-2": "Cannot meet her eyes" },
    prose_constraints: {
      prose_must_not_imply: ["he is over it"],
      forbidden_inventions: ["a brother"],
      voice_do_not_do: ["sarcasm"],
    },
  });

  const ctx = fixtureCtx({ "mchar-2": "Ane" });
  const out = castTranslator(record, ctx);

  assert.ok(out.includes("### Jon"));
  assert.ok(out.includes("**Identity**"));
  assert.ok(out.includes("**World pressure core**"));
  assert.ok(out.includes("**Voice**"));
  assert.ok(out.includes("**Body and presence**"));
  assert.ok(out.includes("**Pressure behavior**"));
  assert.ok(out.includes("**Perception and embodiment**"));
  assert.ok(out.includes("**Agency and planning**"));
  assert.ok(out.includes("**Relationships**"));
  assert.ok(out.includes("**Prose constraints**"));
  assert.ok(out.includes("Ane"));
  assert.ok(out.includes("Anti-generic warnings"));
  assertNoInternalIds(out, "cast");
});

test("cast translator is registered in the translatorRegistry", () => {
  assert.equal(getTranslator("cast"), castTranslator);
});
