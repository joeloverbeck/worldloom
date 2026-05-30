import assert from "node:assert/strict";
import test from "node:test";

import { emotionsTranslator } from "../src/prompt/translators/emotions.js";
import "../src/prompt/translators/emotions.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureEmotion,
} from "./prompt/fixtures.js";

test("emotions translator emits holder, intensity, valence, body", () => {
  const record = fixtureEmotion("memo-1", "Quiet dread", {
    holder: "mchar-1",
    valence: "negative",
    intensity: "strong",
    details: "afraid he is going to say the wrong thing again",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = emotionsTranslator(record, ctx);
  assert.equal(
    out,
    "- Jon feels strongly fraught: afraid he is going to say the wrong thing again",
  );
  assertNoInternalIds(out, "emotions");
});

test("emotions translator is registered", () => {
  assert.equal(getTranslator("emotions"), emotionsTranslator);
});
