import assert from "node:assert/strict";
import test from "node:test";

import { secretCarrierExistence } from "../../src/structural/secret-carrier-existence.js";
import { context, record } from "./helpers.js";

test("secret_carrier_existence accepts carriers that exist in the secret branch", async () => {
  const verdicts = await secretCarrierExistence.run(undefined, context([
    page("PG-1", ["PG-1"]),
    secretRecord("STSEC-1", { created_at_page: "PG-1", clue_carriers: [carrier("BEL", "BEL-1")] }),
    carrierRecord("belief_record", "BEL-1", "beliefs", { created_at_page: "PG-1" })
  ]));

  assert.deepEqual(verdicts, []);
});

test("secret_carrier_existence rejects missing, mismatched, and branch-inactive carriers", async () => {
  const verdicts = await secretCarrierExistence.run(undefined, context([
    page("PG-2", ["PG-1", "PG-2"]),
    page("PG-99", ["PG-99"]),
    secretRecord("STSEC-1", {
      created_at_page: "PG-2",
      clue_carriers: [
        carrier("BEL", "BEL-404"),
        carrier("BEL", "SF-1"),
        carrier("DA", "DA-1")
      ]
    }),
    carrierRecord("story_diegetic_artifact_record", "DA-1", "artifacts", { created_at_page: "PG-99" })
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "secret_carrier_existence.missing_record"));
  assert.ok(verdicts.some((verdict) => verdict.code === "secret_carrier_existence.kind_mismatch"));
  assert.ok(verdicts.some((verdict) => verdict.code === "secret_carrier_existence.branch_inactive_record"));
});

test("secret_carrier_existence participates in STSEC pre-apply plans", () => {
  assert.equal(
    secretCarrierExistence.applies_to(context([], {
      run_mode: "pre-apply",
      patch_plan: {
        plan_id: "secret-test",
        target_world: "test",
        approval_token: "test-token",
        verdict: "ACCEPT",
        originating_skill: "test",
        expected_id_allocations: {},
        patches: [{ op: "create_stsec_record", target_world: "test", payload: { story_slug: "test-story", record: {} } }]
      }
    })),
    true
  );
});

function secretRecord(id: string, overrides: Record<string, unknown>) {
  return record("story_secret_record", `test-story:${id}`, `stories/test-story/_source/secrets/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    secret_kind: "identity",
    secret_claim: "The captain hid a sibling.",
    holders: ["STENT-1"],
    salience: "high",
    source_records: ["BEL-1"],
    status: "hidden",
    ...overrides
  });
}

function carrier(kind: string, recordId: string): Record<string, unknown> {
  return {
    kind,
    record: recordId,
    clue_text: "A clue.",
    clue_strength: "suggestive",
    discovered_by: ["STENT-1"],
    audience_visible: "visible",
    status: "discovered"
  };
}

function carrierRecord(nodeType: string, id: string, subdir: string, overrides: Record<string, unknown>) {
  return record(nodeType, `test-story:${id}`, `stories/test-story/_source/${subdir}/${id}.yaml`, { id, ...overrides });
}

function page(id: string, branchPath: string[]) {
  return record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, { id, branch_path: branchPath });
}
