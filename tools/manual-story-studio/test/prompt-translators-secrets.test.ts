import assert from "node:assert/strict";
import test from "node:test";

import { secretsTranslator } from "../src/prompt/translators/secrets.js";
import "../src/prompt/translators/secrets.js";
import { getTranslator } from "../src/prompt/translators/index.js";

import {
  assertNoInternalIds,
  fixtureCtx,
  fixtureSecret,
} from "./prompt/fixtures.js";

test("secrets translator hidden → do-not-reveal language", () => {
  const record = fixtureSecret("msecret-1", "Ane was followed", {
    held_by: ["mchar-2"],
    audience_visibility: "hidden",
    details: "Ane has not told Jon she was followed last week",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon", "mchar-2": "Ane" });
  const out = secretsTranslator(record, ctx);
  assert.ok(out.includes("- Secret: Ane has not told Jon she was followed last week"));
  assert.ok(out.includes("Held by: Ane"));
  assert.ok(out.includes("Do not let the prose reveal this secret"));
  assertNoInternalIds(out, "secrets-hidden");
});

test("secrets translator revealed → permissive language", () => {
  const record = fixtureSecret("msecret-2", "Public", {
    held_by: ["mchar-1"],
    audience_visibility: "revealed",
    details: "Already common knowledge",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = secretsTranslator(record, ctx);
  assert.ok(!out.includes("Do not"));
  assert.ok(out.includes("Publicly known"));
});

test("secrets translator covers all five audience_visibility variants", () => {
  const variants = [
    "hidden",
    "known_to_holders",
    "rumored",
    "partially_revealed",
    "revealed",
  ] as const;
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const seen = new Set<string>();
  for (const v of variants) {
    const out = secretsTranslator(
      fixtureSecret("msecret-X", "secret", {
        audience_visibility: v,
        held_by: ["mchar-1"],
        details: "x",
      }),
      ctx,
    );
    const audienceLine = out
      .split("\n")
      .find((l) => l.includes("Audience:"));
    assert.ok(audienceLine, `${v}: missing audience line`);
    assert.ok(!seen.has(audienceLine), `${v}: duplicate audience clause`);
    seen.add(audienceLine);
  }
});

test("secrets translator surfaces forbidden reveal tags", () => {
  const record = fixtureSecret("msecret-3", "secret", {
    held_by: ["mchar-1"],
    audience_visibility: "hidden",
    forbidden_reveal_tags: ["the followed-meeting", "the broker's name"],
    details: "stuff",
  });
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const out = secretsTranslator(record, ctx);
  assert.ok(out.includes("Forbidden reveals: the followed-meeting, the broker's name"));
});

test("secrets translator is registered", () => {
  assert.equal(getTranslator("secrets"), secretsTranslator);
});
