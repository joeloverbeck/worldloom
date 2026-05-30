import assert from "node:assert/strict";
import test from "node:test";

import { factsTranslator } from "../src/prompt/translators/facts.js";
import "../src/prompt/translators/facts.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import { assertNoInternalIds, fixtureFact } from "./prompt/fixtures.js";

test("facts translator emits title + details bullet", () => {
  const record = fixtureFact("mfact-1", "It rained all morning", {
    details: "Drains overflowing; lanterns guttered out by the third hour",
  });
  const out = factsTranslator(record);
  assert.equal(
    out,
    "- It rained all morning: Drains overflowing; lanterns guttered out by the third hour",
  );
  assertNoInternalIds(out, "facts");
});

test("facts translator falls back to summary when details empty", () => {
  const record = fixtureFact("mfact-2", "The bell tolled twice", {
    summary: "Two strikes; not the usual hour",
  });
  const out = factsTranslator(record);
  assert.equal(out, "- The bell tolled twice: Two strikes; not the usual hour");
});

test("facts translator emits bare title when both empty", () => {
  const record = fixtureFact("mfact-3", "A bare fact");
  const out = factsTranslator(record);
  assert.equal(out, "- A bare fact");
});

test("facts translator is registered", () => {
  assert.equal(getTranslator("facts"), factsTranslator);
});
