import assert from "node:assert/strict";
import test from "node:test";

import { objectsTranslator } from "../src/prompt/translators/objects.js";
import "../src/prompt/translators/objects.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureObject,
} from "./prompt/fixtures.js";

test("objects translator emits bullet + holder + location + details", () => {
  const record = fixtureObject("mobj-1", "The brass key", {
    summary: "Fits the workshop door",
    details: "Heavier than expected; a single bead of wax stuck to the bow",
    current_holder: "mchar-1",
    current_location: "mloc-1",
  });
  const ctx = fixtureCtx(
    { "mchar-1": "Jon" },
    { "mloc-1": "the dock road" },
  );
  const out = objectsTranslator(record, ctx);
  assert.ok(out.includes("- The brass key: Fits the workshop door"));
  assert.ok(out.includes("Current holder: Jon"));
  assert.ok(out.includes("Current location: the dock road"));
  assert.ok(out.includes("Details: Heavier than expected"));
  assertNoInternalIds(out, "objects");
});

test("objects translator omits holder/location lines when null", () => {
  const record = fixtureObject("mobj-2", "The ledger");
  const ctx = fixtureCtx({});
  const out = objectsTranslator(record, ctx);
  assert.equal(out, "- The ledger");
});

test("objects translator is registered", () => {
  assert.equal(getTranslator("objects"), objectsTranslator);
});
