import assert from "node:assert/strict";
import test from "node:test";

import { questionsTranslator } from "../src/prompt/translators/questions.js";
import "../src/prompt/translators/questions.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureQuestion,
} from "./prompt/fixtures.js";

test("questions translator emits open language when must_not_resolve_unless empty", () => {
  const record = fixtureQuestion("mq-1", "Who burned the dock?", {
    summary: "Open since the second fire",
    must_not_resolve_unless: [],
  });
  const out = questionsTranslator(record);
  assert.ok(out.includes("- Open question: Who burned the dock?"));
  assert.ok(out.includes("Context: Open since the second fire"));
  assert.ok(out.includes("Answer status: open; the answer is not author-known yet."));
  assert.ok(out.includes("Reveal: May be referenced; resolution is at author discretion"));
  assertNoInternalIds(out, "questions-open");
});

test("questions translator emits do-not-resolve language when constraints listed", () => {
  const record = fixtureQuestion("mq-2", "Is the witness alive?", {
    summary: "Hangs over the second act",
    must_not_resolve_unless: [
      "Ane is in the room",
      "the cartographer has spoken first",
    ],
  });
  const out = questionsTranslator(record);
  assert.ok(out.includes("Do not let the prose resolve this question unless: Ane is in the room; the cartographer has spoken first"));
});

test("questions translator flags author-known answers", () => {
  const record = fixtureQuestion("mq-3", "Who hired the witness?", {
    summary: "The author knows this but the scene should not say it yet.",
    answer_known: true,
  });
  const out = questionsTranslator(record);
  assert.ok(out.includes("Answer status: the author knows the answer."));
});

test("questions translator is registered", () => {
  assert.equal(getTranslator("questions"), questionsTranslator);
});
