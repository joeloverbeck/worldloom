import assert from "node:assert/strict";
import test from "node:test";

import {
  emitSection14,
  SECTION_14_TITLE,
} from "../../src/prompt/sections/section-14-stop-rule.js";

test("emitSection14 contains the key meaningful-action sentence (SPEC-107 regression guard)", () => {
  const text = emitSection14().body;
  assert.ok(
    text.includes(
      "Let meaningful action, emotional movement, relational pressure, practical consequence, or discovery occur if the directive calls for it.",
    ),
    "stop rule must permit meaningful turns explicitly per SPEC-107",
  );
});

test("emitSection14 contains the durable-continuity handoff wording", () => {
  const text = emitSection14().body;
  assert.ok(
    text.includes(
      "Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment.",
    ),
    "stop rule must keep durable continuity changes out of author-facing prose",
  );
  assert.doesNotMatch(text, /machine-state conclusions/);
});

test("SECTION_14_TITLE remains 'Stop Rule'", () => {
  assert.strictEqual(SECTION_14_TITLE, "Stop Rule");
});
