import assert from "node:assert/strict";
import test from "node:test";

import { clocksTranslator } from "../src/prompt/translators/clocks.js";
import "../src/prompt/translators/clocks.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureClock,
} from "./prompt/fixtures.js";

test("clocks translator emits title + body + axis + direction", () => {
  const record = fixtureClock("mclock-1", "Trust toward Ane", {
    axis: "trust",
    value: 3,
    direction: "rising",
    details: "Each shared confidence nudges the dial",
  });
  const out = clocksTranslator(record);
  assert.ok(out.includes("- Clock — Trust toward Ane: Each shared confidence nudges the dial"));
  assert.ok(out.includes("Currently trust rising"));
  assert.ok(out.includes("value: 3"));
  assertNoInternalIds(out, "clocks");
});

test("clocks translator omits direction line when unset", () => {
  const record = fixtureClock("mclock-2", "Inert clock", {
    direction: "unset",
    summary: "Not measuring anything yet",
  });
  const out = clocksTranslator(record);
  assert.ok(out.includes("- Clock — Inert clock"));
  assert.ok(!out.includes("Currently"));
});

test("clocks translator is registered", () => {
  assert.equal(getTranslator("clocks"), clocksTranslator);
});
