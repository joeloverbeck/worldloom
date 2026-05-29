import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActiveClocks,
  buildActiveThreads,
  buildHiddenSecrets
} from "../../src/context-packet/story-bundle-context.js";

const STORY_SLUG = "supersession-fixture";

function row(recordId: string, nodeType: string, body: string) {
  return {
    node_id: `${STORY_SLUG}:${recordId}`,
    story_slug: STORY_SLUG,
    node_type: nodeType,
    file_path: `stories/${STORY_SLUG}/_source/${recordId}.yaml`,
    body,
    summary: null
  };
}

test("buildActiveClocks excludes a superseded clock whose own status is still active", () => {
  const rows = [
    row(
      "CLK-1",
      "pressure_clock_record",
      [
        "id: CLK-1",
        "title: The failing light",
        "clock_kind: danger",
        "driver: environment",
        "value: 2",
        "max: 6",
        "salience: high",
        "visibility: public",
        "supersedes: null",
        "status: active",
        ""
      ].join("\n")
    ),
    row(
      "CLK-2",
      "pressure_clock_record",
      [
        "id: CLK-2",
        "title: Dusk over the isolated park",
        "clock_kind: danger",
        "driver: environment",
        "value: 3",
        "max: 6",
        "salience: high",
        "visibility: public",
        "supersedes: CLK-1",
        "status: active",
        ""
      ].join("\n")
    )
  ];

  const clocks = buildActiveClocks(rows);
  assert.deepEqual(
    clocks.map((clock) => clock.id),
    ["CLK-2"]
  );
});

test("buildActiveThreads excludes a superseded thread whose own status is still active", () => {
  const rows = [
    row(
      "THR-1",
      "thread_record",
      [
        "id: THR-1",
        "type: seduction",
        "status: active",
        "current_pressure: 3",
        "desired_cadence: 2",
        "supersedes: null",
        "obligations: []",
        ""
      ].join("\n")
    ),
    row(
      "THR-2",
      "thread_record",
      [
        "id: THR-2",
        "type: seduction",
        "status: pressured",
        "current_pressure: 5",
        "desired_cadence: 2",
        "supersedes: THR-1",
        "obligations: []",
        ""
      ].join("\n")
    )
  ];

  const threads = buildActiveThreads(rows);
  assert.deepEqual(
    threads.map((thread) => thread.id),
    ["THR-2"]
  );
});

test("buildHiddenSecrets excludes a superseded secret whose own status is still hidden", () => {
  const rows = [
    row(
      "STSEC-1",
      "story_secret_record",
      [
        "id: STSEC-1",
        "secret_kind: event_cause",
        "salience: high",
        "supersedes: null",
        "holders:",
        "  - STENT-2",
        "clue_carriers: []",
        "protected_mystery_refs: []",
        "status: hidden",
        ""
      ].join("\n")
    ),
    row(
      "STSEC-2",
      "story_secret_record",
      [
        "id: STSEC-2",
        "secret_kind: event_cause",
        "salience: high",
        "supersedes: STSEC-1",
        "holders:",
        "  - STENT-2",
        "clue_carriers: []",
        "protected_mystery_refs: []",
        "status: hidden",
        ""
      ].join("\n")
    )
  ];

  const secrets = buildHiddenSecrets(rows);
  assert.deepEqual(
    secrets.map((secret) => secret.id),
    ["STSEC-2"]
  );
});

test("active-state builders retain non-superseded records under the status filter", () => {
  const clockRows = [
    row(
      "CLK-9",
      "pressure_clock_record",
      ["id: CLK-9", "supersedes: null", "status: resolved", ""].join("\n")
    ),
    row(
      "CLK-10",
      "pressure_clock_record",
      ["id: CLK-10", "supersedes: null", "status: active", ""].join("\n")
    )
  ];

  assert.deepEqual(
    buildActiveClocks(clockRows).map((clock) => clock.id),
    ["CLK-10"]
  );
});
