import assert from "node:assert/strict";
import test from "node:test";

import type { CurrentContext } from "../../src/schema/current-context.js";
import { emptyKnownIds, type KnownIds } from "../../src/validate/refs.js";
import {
  CURRENT_CONTEXT_POV_NOT_IN_CAST,
  CURRENT_CONTEXT_REFERENCE_BROKEN,
  validateCurrentContext,
} from "../../src/validate/current-context.js";

const KNOWN_SEGMENTS = ["SEG-1", "SEG-7"];

function knownIds(): KnownIds {
  const known = emptyKnownIds();
  known.cast.add("mchar-1");
  known.cast.add("mchar-3");
  known.locations.add("mloc-2");
  known.clocks.add("mclock-1");
  known.secrets.add("msecret-2");
  known.questions.add("mq-1");
  known.relationships.add("mrel-4");
  known.obligations.add("mobl-1");
  return known;
}

function validContext(overrides: Partial<CurrentContext> = {}): CurrentContext {
  return {
    current_location: "mloc-2",
    current_cast: ["mchar-1", "mchar-3"],
    pov_holder: "mchar-1",
    active_pressure_clocks: ["mclock-1"],
    active_secrets_questions: ["msecret-2", "mq-1"],
    pinned_records: ["mrel-4", "mobl-1"],
    excluded_records: ["mrel-4"],
    must_not_reveal: ["msecret-2"],
    current_handoff_summary: "Mara waits in the riverhouse kitchen.",
    last_accepted_segment: "SEG-7",
    last_reviewed_after_segment: "SEG-7",
    ...overrides,
  };
}

function expectSingleError(
  ctx: CurrentContext,
  field: string,
  code: string,
): void {
  const result = validateCurrentContext(ctx, knownIds(), KNOWN_SEGMENTS);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0]?.field, field);
    assert.equal(result.errors[0]?.code, code);
  }
}

test("validateCurrentContext: valid payload returns ok", () => {
  const result = validateCurrentContext(validContext(), knownIds(), KNOWN_SEGMENTS);

  assert.equal(result.ok, true);
});

test("validateCurrentContext: pov_holder must be included in current_cast", () => {
  const ctx = validContext({ pov_holder: "mchar-3", current_cast: ["mchar-1"] });

  expectSingleError(ctx, "pov_holder", CURRENT_CONTEXT_POV_NOT_IN_CAST);
});

test("validateCurrentContext: unknown current_location is rejected", () => {
  expectSingleError(
    validContext({ current_location: "mloc-99" }),
    "current_location",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: unknown current_cast entry is rejected", () => {
  expectSingleError(
    validContext({ current_cast: ["mchar-1", "mchar-99"] }),
    "current_cast[1]",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: unknown active pressure clock is rejected", () => {
  expectSingleError(
    validContext({ active_pressure_clocks: ["mclock-99"] }),
    "active_pressure_clocks[0]",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: unknown active secret/question is rejected", () => {
  expectSingleError(
    validContext({ active_secrets_questions: ["mq-99"] }),
    "active_secrets_questions[0]",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: unknown pinned record is rejected", () => {
  expectSingleError(
    validContext({ pinned_records: ["mrel-4", "mobl-99"] }),
    "pinned_records[1]",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: known excluded record is accepted", () => {
  const result = validateCurrentContext(
    validContext({ excluded_records: ["mrel-4", "mobl-1"] }),
    knownIds(),
    KNOWN_SEGMENTS,
  );

  assert.equal(result.ok, true);
});

test("validateCurrentContext: unknown excluded record is rejected", () => {
  expectSingleError(
    validContext({ excluded_records: ["mrel-4", "mobl-99"] }),
    "excluded_records[1]",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: unknown must-not-reveal record is rejected", () => {
  expectSingleError(
    validContext({ must_not_reveal: ["msecret-99"] }),
    "must_not_reveal[0]",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: unknown accepted segment is rejected", () => {
  expectSingleError(
    validContext({ last_accepted_segment: "SEG-99" }),
    "last_accepted_segment",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});

test("validateCurrentContext: unknown reviewed segment is rejected", () => {
  expectSingleError(
    validContext({ last_reviewed_after_segment: "SEG-99" }),
    "last_reviewed_after_segment",
    CURRENT_CONTEXT_REFERENCE_BROKEN,
  );
});
