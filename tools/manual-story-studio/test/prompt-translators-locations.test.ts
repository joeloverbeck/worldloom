import assert from "node:assert/strict";
import test from "node:test";

import { locationsTranslator } from "../src/prompt/translators/locations.js";
import "../src/prompt/translators/locations.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureLocation,
} from "./prompt/fixtures.js";

test("locations translator emits sub-heading + summary + details", () => {
  const record = fixtureLocation("mloc-1", "The dock road", {
    summary: "Cobbled street curving toward the river",
    details: "Lined with shuttered warehouses; lanterns at the corners only",
  });
  const out = locationsTranslator(record);
  assert.ok(out.startsWith("### The dock road"));
  assert.ok(out.includes("Summary: Cobbled street curving toward the river"));
  assert.ok(out.includes("Details: Lined with shuttered warehouses"));
  assertNoInternalIds(out, "locations");
});

test("locations translator emits only heading when summary/details empty", () => {
  const record = fixtureLocation("mloc-2", "Unknown place");
  const out = locationsTranslator(record);
  assert.equal(out, "### Unknown place");
});

test("locations translator is registered", () => {
  assert.equal(getTranslator("locations"), locationsTranslator);
});
