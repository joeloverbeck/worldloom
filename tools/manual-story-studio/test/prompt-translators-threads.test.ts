import assert from "node:assert/strict";
import test from "node:test";

import { threadsTranslator } from "../src/prompt/translators/threads.js";
import "../src/prompt/translators/threads.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureThread,
} from "./prompt/fixtures.js";

test("threads translator emits heading + subject + status + summary/details", () => {
  const record = fixtureThread("mthr-1", "Ledger heist", {
    subject: "mchar-1",
    status: "building",
    summary: "Jon's plan to retrieve the brass-key ledger",
    details: "Three days from the shift change; one piece of luck still owed",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = threadsTranslator(record, ctx);
  assert.ok(out.includes("### Thread — Ledger heist"));
  assert.ok(out.includes("Subject: Jon"));
  assert.ok(out.includes("Status: building"));
  assert.ok(out.includes("Summary: Jon's plan to retrieve the brass-key ledger"));
  assert.ok(out.includes("Current state: Three days from the shift change"));
  assertNoInternalIds(out, "threads");
});

test("threads translator is registered", () => {
  assert.equal(getTranslator("threads"), threadsTranslator);
});
