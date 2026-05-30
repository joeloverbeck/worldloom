import assert from "node:assert/strict";
import test from "node:test";

import { relationshipsTranslator } from "../src/prompt/translators/relationships.js";
import "../src/prompt/translators/relationships.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureRelationship,
} from "./prompt/fixtures.js";

test("relationships translator emits pair heading + axes + state", () => {
  const record = fixtureRelationship("mrel-1", "Jon and Ane", {
    between: ["mchar-1", "mchar-2"],
    axes: {
      trust: "low",
      fear: "medium",
      attraction: "high",
      power: "medium",
      respect: "high",
      familiarity: "medium",
    },
    dominant_axis: "attraction",
    details: "Trust is still under construction; attraction is doing the heavy lifting",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon", "mchar-2": "Ane" });
  const out = relationshipsTranslator(record, ctx);
  assert.ok(out.startsWith("### Jon ↔ Ane"));
  assert.ok(out.includes("Axes:"));
  assert.ok(out.includes("trust: low"));
  assert.ok(out.includes("Dominant axis: attraction"));
  assert.ok(out.includes("Current state: Trust is still under construction"));
  assertNoInternalIds(out, "relationships");
});

test("relationships translator omits 'unset' axes", () => {
  const record = fixtureRelationship("mrel-2", "Unsettled", {
    between: ["mchar-1", "mchar-2"],
    axes: {
      trust: "unset",
      fear: "unset",
      attraction: "low",
      power: "unset",
      respect: "unset",
      familiarity: "unset",
    },
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon", "mchar-2": "Ane" });
  const out = relationshipsTranslator(record, ctx);
  assert.ok(out.includes("attraction: low"));
  assert.ok(!out.includes("trust:"));
  assert.ok(!out.includes("fear:"));
});

test("relationships translator is registered", () => {
  assert.equal(getTranslator("relationships"), relationshipsTranslator);
});
