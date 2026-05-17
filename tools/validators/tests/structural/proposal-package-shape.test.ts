import assert from "node:assert/strict";
import test from "node:test";

import { proposalPackageShape } from "../../src/structural/proposal-package-shape.js";
import { context } from "./helpers.js";

test("proposal_package_shape rejects promotion-only fields inside candidate", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(`
promotion_id: SP-1
story_slug: test-story
source_kind: story_fact
candidate:
  title: Branch claim
  status: contested_canon
  type: event
  statement: A branch-local claim.
  scope: { geographic: local, temporal: current, social: public }
  truth_scope: { world_level: false, diegetic_status: disputed }
  domains_affected: [history]
  required_world_updates: [TIMELINE]
  contradiction_risk: { hard: false, soft: true }
  source_basis:
    direct_user_approval: false
    derived_from: []
    story_branch: BR-1
    story_evidence:
      source_records: [SF-1]
  promotion_provenance:
    story_slug: test-story
proposal_evidence:
  story_branch: BR-1
  source_kind: story_fact
  source_records: [SF-1]
`),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "proposal_package_candidate_impurity"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("candidate.source_basis.story_branch")));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("candidate.source_basis.story_evidence")));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("candidate.promotion_provenance")));
});

test("proposal_package_shape accepts split candidate and proposal_evidence", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(`
promotion_id: SP-1
story_slug: test-story
source_kind: story_fact
candidate:
  title: Branch claim
  status: contested_canon
  type: event
  statement: A branch-local claim.
  scope: { geographic: local, temporal: current, social: public }
  truth_scope: { world_level: false, diegetic_status: disputed }
  domains_affected: [history]
  required_world_updates: [TIMELINE]
  contradiction_risk: { hard: false, soft: true }
  source_basis:
    direct_user_approval: false
    derived_from: []
proposal_evidence:
  story_branch: BR-1
  source_kind: story_fact
  source_records: [SF-1]
  supporting_pages: [PG-1]
  authoring_events: [SE-1]
  belief_witnesses: [BEL-1]
  rendered_prose_receipts: [pages-prose-receipts/PG-1.yaml]
  rationale: Branch evidence supports the proposal.
`),
    context([])
  );

  assert.deepEqual(verdicts, []);
});

test("proposal_package_shape accepts mystery_resolution SF and BEL source records", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(`
promotion_id: SP-1
story_slug: test-story
source_kind: mystery_resolution
candidate:
  title: Branch mystery claim
  status: contested_canon
  type: event
  statement: A branch-local mystery claim.
  scope: { geographic: local, temporal: current, social: public }
  truth_scope: { world_level: false, diegetic_status: disputed }
  domains_affected: [history]
  required_world_updates: [TIMELINE]
  contradiction_risk: { hard: false, soft: true }
  source_basis:
    direct_user_approval: false
    derived_from: []
proposal_evidence:
  story_branch: BR-1
  source_kind: mystery_resolution
  source_records: [SF-1, BEL-1]
  supporting_pages: [PG-1]
  authoring_events: [SE-1]
  belief_witnesses: [BEL-1]
  rendered_prose_receipts: [pages-prose-receipts/PG-1.yaml]
  rationale: Branch evidence supports the proposal.
`),
    context([])
  );

  assert.deepEqual(verdicts, []);
});

test("proposal_package_shape rejects mystery_resolution M source records", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(`
promotion_id: SP-1
story_slug: test-story
source_kind: mystery_resolution
candidate:
  title: Branch mystery claim
  status: contested_canon
  type: event
  statement: A branch-local mystery claim.
  scope: { geographic: local, temporal: current, social: public }
  truth_scope: { world_level: false, diegetic_status: disputed }
  domains_affected: [history]
  required_world_updates: [TIMELINE]
  contradiction_risk: { hard: false, soft: true }
  source_basis:
    direct_user_approval: false
    derived_from: []
proposal_evidence:
  story_branch: BR-1
  source_kind: mystery_resolution
  source_records: [M-3]
  supporting_pages: [PG-1]
  authoring_events: [SE-1]
  belief_witnesses: [BEL-1]
  rendered_prose_receipts: [pages-prose-receipts/PG-1.yaml]
  rationale: Branch evidence supports the proposal.
`),
    context([])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "mystery_resolution_source_record_misclass");
  assert.match(verdicts[0]?.message ?? "", /M-3/);
});

test("proposal_package_shape requires top-level proposal_evidence", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(`
promotion_id: SP-1
story_slug: test-story
source_kind: story_fact
candidate:
  title: Branch claim
  status: contested_canon
  type: event
  statement: A branch-local claim.
  scope: { geographic: local, temporal: current, social: public }
  truth_scope: { world_level: false, diegetic_status: disputed }
  domains_affected: [history]
  required_world_updates: [TIMELINE]
  contradiction_risk: { hard: false, soft: true }
  source_basis:
    direct_user_approval: false
    derived_from: []
`),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "proposal_package_evidence_missing"));
});

test("proposal_package_shape is scoped to proposal-package paths outside full-world runs", () => {
  assert.equal(
    proposalPackageShape.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test-story/story-promotions/SP-1-proposal-package.yaml"] })),
    true
  );
  assert.equal(
    proposalPackageShape.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/facts/SF-1.yaml"] })),
    false
  );
});

test("proposal_package_shape rejects safety-sensitive candidate without epistemic_profile", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(candidatePackage("knowledge_asymmetric_fact")),
    context([])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "proposal_candidate_epistemic_profile_missing");
});

test("proposal_package_shape rejects safety-sensitive candidate without exception_governance", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(candidatePackage("technology")),
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "proposal_candidate_exception_governance_missing"));
});

test("proposal_package_shape accepts non-sensitive event candidate without safety blocks", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(candidatePackage("event")),
    context([])
  );

  assert.ok(verdicts.every((verdict) => !verdict.code.startsWith("proposal_candidate_")));
});

test("proposal_package_shape accepts substantive n_a safety rationale", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(candidatePackage("technology", `
  exception_governance:
    n_a: no exception axis applies because this artifact effect is universally available across the populace, per ontology category artifact
  epistemic_profile:
    n_a: no special secrecy axis applies because public artifact evidence is visible to ordinary people
`)),
    context([])
  );

  assert.ok(verdicts.every((verdict) => !verdict.code.startsWith("proposal_candidate_")));
});

test("proposal_package_shape rejects thin n_a safety rationale", async () => {
  const verdicts = await proposalPackageShape.run(
    inputFile(candidatePackage("technology", `
  exception_governance:
    n_a: N/A
  epistemic_profile:
    n_a: no special secrecy axis applies because public artifact evidence is visible to ordinary people
`)),
    context([])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "proposal_candidate_na_rationale_quality");
});

function inputFile(content: string) {
  return {
    files: [
      {
        path: "stories/test-story/story-promotions/SP-1-proposal-package.yaml",
        content
      }
    ]
  };
}

function candidatePackage(type: string, safetyBlocks = ""): string {
  return `
promotion_id: SP-1
story_slug: test-story
source_kind: story_fact
candidate:
  id: CF-1
  title: Branch claim
  status: contested_canon
  type: ${type}
  statement: A branch-local claim.
  scope: { geographic: local, temporal: current, social: public }
  truth_scope: { world_level: false, diegetic_status: disputed }
  domains_affected: [history]
  required_world_updates: [TIMELINE]
  contradiction_risk: { hard: false, soft: true }
  source_basis:
    direct_user_approval: false
    derived_from: []
${safetyBlocks}proposal_evidence:
  story_branch: BR-1
  source_kind: story_fact
  source_records: [SF-1]
  supporting_pages: [PG-1]
  authoring_events: [SE-1]
  belief_witnesses: [BEL-1]
  rendered_prose_receipts: [pages-prose-receipts/PG-1.yaml]
  rationale: Branch evidence supports the proposal.
`;
}
