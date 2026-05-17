import assert from "node:assert/strict";
import test from "node:test";

import { secretMysteryFirewallCompliance } from "../../src/structural/secret-mystery-firewall-compliance.js";
import { context, record } from "./helpers.js";

test("secret_mystery_firewall_compliance accepts revealed secrets against non-forbidden mysteries", async () => {
  const verdicts = await secretMysteryFirewallCompliance.run(undefined, context([
    secretRecord({ protected_mystery_refs: ["M-1"], status: "revealed" }),
    mystery("M-1", "active")
  ]));

  assert.deepEqual(verdicts, []);
});

test("secret_mystery_firewall_compliance rejects missing and forbidden mysteries", async () => {
  const verdicts = await secretMysteryFirewallCompliance.run(undefined, context([
    secretRecord({ protected_mystery_refs: ["M-1", "M-404"], status: "revealed" }),
    mystery("M-1", "forbidden")
  ]));

  assert.ok(verdicts.some((verdict) => verdict.code === "secret_mystery_firewall_compliance.forbidden_mystery_revealed"));
  assert.ok(verdicts.some((verdict) => verdict.code === "secret_mystery_firewall_compliance.missing_mystery"));
});

test("secret_mystery_firewall_compliance allows hidden secrets to reference forbidden mysteries without resolving them", async () => {
  const verdicts = await secretMysteryFirewallCompliance.run(undefined, context([
    secretRecord({ protected_mystery_refs: ["M-1"], status: "hidden" }),
    mystery("M-1", "forbidden")
  ]));

  assert.deepEqual(verdicts, []);
});

function secretRecord(overrides: Record<string, unknown>) {
  return record("story_secret_record", "test-story:STSEC-1", "stories/test-story/_source/secrets/STSEC-1.yaml", {
    id: "STSEC-1",
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

function mystery(id: string, status: string) {
  return record("mystery_reserve_entry", id, `_source/mystery-reserve/${id}.yaml`, { id, status });
}
