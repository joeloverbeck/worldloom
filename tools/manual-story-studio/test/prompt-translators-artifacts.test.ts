import assert from "node:assert/strict";
import test from "node:test";

import { artifactsTranslator } from "../src/prompt/translators/artifacts.js";
import "../src/prompt/translators/artifacts.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureArtifact,
  fixtureCtx,
} from "./prompt/fixtures.js";

test("artifacts translator emits title + summary + holder + provenance + details", () => {
  const record = fixtureArtifact("martifact-1", "The river-fires chronicle", {
    summary: "Anonymous account of the dock fires, copied in three hands",
    details: "Bound in oilcloth; the second hand is the cartographer's",
    current_holder: "mchar-1",
    provenance: "Recovered from the burned warehouse, year 642",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = artifactsTranslator(record, ctx);
  assert.ok(out.includes("- Artifact — The river-fires chronicle: Anonymous account"));
  assert.ok(out.includes("Current holder: Jon"));
  assert.ok(out.includes("Provenance: Recovered from the burned warehouse, year 642"));
  assert.ok(out.includes("Details: Bound in oilcloth"));
  assertNoInternalIds(out, "artifacts");
});

test("artifacts translator omits holder/provenance/details when empty", () => {
  const record = fixtureArtifact("martifact-2", "Unsourced fragment");
  const ctx = fixtureCtx({});
  const out = artifactsTranslator(record, ctx);
  assert.equal(out, "- Artifact — Unsourced fragment");
});

test("artifacts translator is registered", () => {
  assert.equal(getTranslator("artifacts"), artifactsTranslator);
});
