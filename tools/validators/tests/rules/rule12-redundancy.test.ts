import assert from "node:assert/strict";
import test from "node:test";

import { rule12Redundancy } from "../../src/rules/rule12-redundancy.js";
import { cfRecord, completeCf, testContext } from "./helpers.js";
import { record, validSection } from "../structural/helpers.js";

const coreTruth = {
  ...completeCf,
  status: "hard_canon",
  truth_scope: { world_level: true, diegetic_status: "objective" },
  epistemic_profile: {
    directly_observable_by: ["public"],
    inferable_by: [],
    recorded_by: ["ward ledgers"],
    suppressed_by: [],
    distortion_vectors: [],
    propagation_channels: [],
    evidence_left: ["law notices"],
    knowledge_exclusions: []
  }
};

test("rule12_redundancy accepts hard-canon core truth with two trace registers", async () => {
  const cf = cfRecord("CF-0001", coreTruth);
  const law = sectionRecord("SEC-INS-001", {
    heading: "Ward Law",
    body: "Trace register: law. The ward code names the truth."
  });
  const songs = sectionRecord("SEC-ELF-001", {
    file_class: "EVERYDAY_LIFE",
    body: "Trace register: songs. Children sing the truth in lock-night verses."
  });

  const result = await rule12Redundancy.run({}, testContext([cf, law, songs]));

  assert.deepEqual(result, []);
});

test("rule12_redundancy fails hard-canon core truth with one trace register", async () => {
  const cf = cfRecord("CF-0001", coreTruth);
  const law = sectionRecord("SEC-INS-001", {
    body: "Trace register: law. The ward code names the truth."
  });

  const result = await rule12Redundancy.run({}, testContext([cf, law]));

  assert.deepEqual(result.map((verdict) => verdict.code), ["rule12.insufficient_trace_registers"]);
  assert.match(result[0]?.message ?? "", /found 1/);
});

test("rule12_redundancy applies hidden-truth carve-out for Mystery Reserve source basis", async () => {
  const cf = cfRecord("CF-0001", {
    ...coreTruth,
    source_basis: { direct_user_approval: true, derived_from: ["M-1"] }
  });

  const result = await rule12Redundancy.run({}, testContext([cf]));

  assert.deepEqual(result, []);
});

test("rule12_redundancy ignores historical hard canon without SPEC-09 blocks", async () => {
  const cf = cfRecord("CF-0001", {
    ...completeCf,
    status: "hard_canon",
    truth_scope: { world_level: true, diegetic_status: "objective" }
  });

  const result = await rule12Redundancy.run({}, testContext([cf]));

  assert.deepEqual(result, []);
});

function sectionRecord(id: string, overrides: Record<string, unknown>) {
  const fileClass = typeof overrides.file_class === "string" ? overrides.file_class : validSection.file_class;
  const subdir = fileClass === "EVERYDAY_LIFE" ? "everyday-life" : "institutions";
  return record("section", id, `_source/${subdir}/${id}.yaml`, {
    ...validSection,
    id,
    touched_by_cf: ["CF-0001"],
    ...overrides
  });
}
