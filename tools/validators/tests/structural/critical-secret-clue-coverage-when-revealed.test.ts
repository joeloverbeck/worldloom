import assert from "node:assert/strict";
import test from "node:test";

import { criticalSecretClueCoverageWhenRevealed } from "../../src/structural/critical-secret-clue-coverage-when-revealed.js";
import { context, record } from "./helpers.js";

test("critical_secret_clue_coverage_when_revealed accepts two discovered carriers before reveal", async () => {
  const verdicts = await criticalSecretClueCoverageWhenRevealed.run(undefined, context([
    page("PG-1", ["PG-1"]),
    page("PG-2", ["PG-1", "PG-2"]),
    event("SE-2", "PG-2"),
    secretRecord({ reveal_event: "SE-2" }),
    storyRecord("belief_record", "BEL-1", "beliefs", "PG-1"),
    storyRecord("story_fact_record", "SF-1", "facts", "PG-2")
  ]));

  assert.deepEqual(verdicts, []);
});

test("critical_secret_clue_coverage_when_revealed rejects insufficient discovered carriers", async () => {
  const verdicts = await criticalSecretClueCoverageWhenRevealed.run(undefined, context([
    page("PG-1", ["PG-1"]),
    page("PG-2", ["PG-1", "PG-2"]),
    event("SE-2", "PG-2"),
    secretRecord({
      reveal_event: "SE-2",
      clue_carriers: [
        carrier("BEL", "BEL-1", "discovered"),
        carrier("SF", "SF-1", "available")
      ]
    }),
    storyRecord("belief_record", "BEL-1", "beliefs", "PG-1"),
    storyRecord("story_fact_record", "SF-1", "facts", "PG-1")
  ]));

  assert.equal(verdicts[0]?.code, "critical_secret_clue_coverage_when_revealed.insufficient_clue_coverage");
});

test("critical_secret_clue_coverage_when_revealed ignores low-salience revealed secrets", async () => {
  const verdicts = await criticalSecretClueCoverageWhenRevealed.run(undefined, context([
    secretRecord({ salience: "low", reveal_event: null, clue_carriers: [] })
  ]));

  assert.deepEqual(verdicts, []);
});

function secretRecord(overrides: Record<string, unknown>) {
  return record("story_secret_record", "test-story:STSEC-1", "stories/test-story/_source/secrets/STSEC-1.yaml", {
    id: "STSEC-1",
    story_id: "STORY-1",
    created_at_page: "PG-2",
    secret_kind: "identity",
    secret_claim: "The captain hid a sibling.",
    holders: ["STENT-1"],
    salience: "high",
    source_records: ["BEL-1"],
    status: "revealed",
    clue_carriers: [
      carrier("BEL", "BEL-1", "discovered"),
      carrier("SF", "SF-1", "discovered")
    ],
    ...overrides
  });
}

function carrier(kind: string, recordId: string, status: string): Record<string, unknown> {
  return {
    kind,
    record: recordId,
    clue_text: "A clue.",
    clue_strength: "suggestive",
    discovered_by: ["STENT-1"],
    audience_visible: "visible",
    status
  };
}

function storyRecord(nodeType: string, id: string, subdir: string, createdAtPage: string) {
  return record(nodeType, `test-story:${id}`, `stories/test-story/_source/${subdir}/${id}.yaml`, { id, created_at_page: createdAtPage });
}

function event(id: string, createdAtPage: string) {
  return storyRecord("story_event_record", id, "events", createdAtPage);
}

function page(id: string, branchPath: string[]) {
  return record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, { id, branch_path: branchPath });
}
