import assert from "node:assert/strict";
import test from "node:test";

import { entitiesTranslator } from "../src/prompt/translators/entities.js";
import "../src/prompt/translators/entities.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import { assertNoInternalIds, fixtureEntity } from "./prompt/fixtures.js";

test("entities translator emits title + summary bullet", () => {
  const record = fixtureEntity("ment-1", "The Cartographers' Guild", {
    summary: "Mapmakers tied to the river fires investigation",
  });
  const out = entitiesTranslator(record);
  assert.equal(out, "- The Cartographers' Guild: Mapmakers tied to the river fires investigation");
  assertNoInternalIds(out, "entities");
});

test("entities translator appends Details when non-empty", () => {
  const record = fixtureEntity("ment-2", "Cartographers", {
    summary: "Map guild",
    details: "Three masters and a dozen apprentices, based at the dock road",
  });
  const out = entitiesTranslator(record);
  assert.ok(out.includes("- Cartographers: Map guild"));
  assert.ok(out.includes("Details: Three masters"));
  assertNoInternalIds(out, "entities");
});

test("entities translator is registered", () => {
  assert.equal(getTranslator("entities"), entitiesTranslator);
});
