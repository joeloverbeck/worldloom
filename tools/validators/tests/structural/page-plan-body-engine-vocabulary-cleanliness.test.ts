import assert from "node:assert/strict";
import test from "node:test";

import {
  RECORD_ID_PREFIXES
} from "../../src/structural/_engine-vocabulary-tokens.js";
import {
  ENGINE_SECTION_NUMBERS,
  pagePlanBodyEngineVocabularyCleanliness
} from "../../src/structural/page-plan-body-engine-vocabulary-cleanliness.js";
import { context } from "./helpers.js";

const STORY = "test-story";
const PLAN_PATH = `stories/${STORY}/pages-prose-plans/PG-1.md`;

test("page_plan_body_engine_vocabulary_cleanliness passes clean prose body sections and allow-listed engine sections", async () => {
  const verdicts = await run(plan());

  assert.deepEqual(verdicts, []);
});

test("page_plan_body_engine_vocabulary_cleanliness allows record IDs and schema-field literals in engine sections", async () => {
  const verdicts = await run(plan({
    section7: [
      "## 7. Selected Event and State Delta",
      "",
      "The page creates STINT-4, STEMO-5, BEL-9, THR-2, and OBL-3.",
      "THR-2 supersedes THR-1 as the open pressure carrier."
    ].join("\n")
  }));

  assert.deepEqual(verdicts, []);
});

test("page_plan_body_engine_vocabulary_cleanliness still warns on predicate DSL tokens in engine sections", async () => {
  const verdicts = await run(plan({
    section7: [
      "## 7. Selected Event and State Delta",
      "",
      "The state movement depends on pred: pressure rather than a prose explanation."
    ].join("\n")
  }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.severity, "warn");
  assert.equal(verdicts[0]?.code, "page_plan_body_engine_vocabulary_cleanliness.warn");
  assert.deepEqual((verdicts[0]?.detail as { hit_count?: number }).hit_count, 1);
  assert.deepEqual(
    (verdicts[0]?.detail as { hits?: Array<{ token: string; token_class: string }> }).hits?.map((hit) => ({
      token: hit.token,
      token_class: hit.token_class
    })),
    [{ token: "pred:", token_class: "predicate_dsl" }]
  );
});

test("page_plan_body_engine_vocabulary_cleanliness warns on one or two prose-facing body hits in a section", async () => {
  const verdicts = await run(plan({
    section1: [
      "## 1. Story Kernel Excerpt",
      "",
      "A stray STINT-4 citation is an isolated authoring slip."
    ].join("\n")
  }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.severity, "warn");
  assert.equal(verdicts[0]?.code, "page_plan_body_engine_vocabulary_cleanliness.warn");
  assert.deepEqual((verdicts[0]?.detail as { hit_count?: number }).hit_count, 1);
});

test("page_plan_body_engine_vocabulary_cleanliness fails on three or more prose-facing body hits in a section", async () => {
  const verdicts = await run(plan({
    section1: [
      "## 1. Story Kernel Excerpt",
      "",
      "The page creates STINT-4, STEMO-5, and BEL-9 as visible bookkeeping."
    ].join("\n")
  }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.severity, "fail");
  assert.equal(verdicts[0]?.code, "page_plan_body_engine_vocabulary_cleanliness.fail");
  assert.deepEqual(
    (verdicts[0]?.detail as { hits?: Array<{ token: string }> }).hits?.map((hit) => hit.token),
    ["STINT-4", "STEMO-5", "BEL-9"]
  );
});

test("page_plan_body_engine_vocabulary_cleanliness allow-lists sections 2, 3, 15, 19 and 16a grounding IDs", async () => {
  const verdicts = await run(plan({
    section16a: [
      "## 16a. STCHAR-derived character authority packets",
      "",
      "- STENT-1 / STCHAR-1 — Test Character.",
      "  - Current-state grounding records: STEMO-1, BEL-1, STPLAN-1, PG-1, SE-1.",
      "  - Page-local projection: no schema terms here."
    ].join("\n")
  }));

  assert.deepEqual(verdicts, []);
});

test("page_plan_body_engine_vocabulary_cleanliness scans 16a non-grounding schema and predicate tokens", async () => {
  const verdicts = await run(plan({
    section16a: [
      "## 16a. STCHAR-derived character authority packets",
      "",
      "- STENT-1 / STCHAR-1 — Test Character.",
      "  - Current-state grounding records: STEMO-1, BEL-1.",
      "  - Page-local projection: avoid state_delta and plan_active( in renderer-facing language."
    ].join("\n")
  }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.severity, "warn");
  assert.deepEqual(
    (verdicts[0]?.detail as { hits?: Array<{ token: string }> }).hits?.map((hit) => hit.token),
    ["state_delta", "plan_active("]
  );
});

test("engine vocabulary token source covers SPEC-91 record class prefixes", () => {
  assert.deepEqual(
    RECORD_ID_PREFIXES,
    [
      "PG",
      "SE",
      "BEL",
      "SF",
      "STENT",
      "STINT",
      "OBL",
      "CNSQ",
      "THR",
      "SREL",
      "STLOC",
      "STOBJ",
      "STPLAN",
      "STEMO",
      "DA",
      "BR",
      "CHC",
      "SLT",
      "STORY",
      "STSTAT",
      "STCHAR",
      "CLK",
      "STSEC",
      "STQ",
      "SCN",
      "M",
      "CF",
      "CH",
      "INV",
      "ENT",
      "SEC",
      "CHAR",
      "SAU",
      "SP",
      "RSP",
      "SLB",
      "PA",
      "NCP",
      "NCB",
      "EPE",
      "NWP",
      "NWB",
      "AU",
      "PR",
      "RP"
    ]
  );
});

test("page plan body engine vocabulary policy names the current engine sections", () => {
  assert.deepEqual(
    [...ENGINE_SECTION_NUMBERS],
    ["5", "6", "7", "7a", "8", "9", "9b", "9c", "10", "10b", "13", "14"]
  );
});

async function run(content: string) {
  return pagePlanBodyEngineVocabularyCleanliness.run(
    { files: [{ path: PLAN_PATH, content }] },
    context([])
  );
}

function plan(overrides: { section1?: string; section7?: string; section16a?: string } = {}): string {
  return [
    overrides.section1 ?? [
      "## 1. Story Kernel Excerpt",
      "",
      "The story kernel remains plain prose."
    ].join("\n"),
    "",
    "## 2. Content Policy",
    "PG-1 and state_delta are allowed here because this section is verbatim-inlined policy.",
    "",
    "## 3. Prose Craft Contract",
    "PG-1 and state_delta are allowed here because this section is verbatim-inlined craft contract.",
    "",
    overrides.section7 ?? [
      "## 7. Selected Event and State Delta",
      "",
      "Jon notices the scene pressure in plain prose."
    ].join("\n"),
    "",
    overrides.section16a ?? [
      "## 16a. STCHAR-derived character authority packets",
      "",
      "- STENT-1 / STCHAR-1 — Test Character.",
      "  - Current-state grounding records: STEMO-1, BEL-1.",
      "  - Page-local projection: she stays still."
    ].join("\n"),
    "",
    "## 15. Plan Frontmatter",
    "state_delta.create: [STINT-4, STEMO-5, BEL-9]",
    "",
    "## 19. Render-Time Instruction Block",
    "PG-1 and validation_trace are allowed here because this is verbatim-inlined guidance."
  ].join("\n");
}
